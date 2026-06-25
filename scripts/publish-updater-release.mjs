import { execFileSync } from 'node:child_process'
import { mkdtempSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const repoRoot = process.cwd()
const tauriConfigPath = path.join(repoRoot, 'src-tauri', 'tauri.conf.json')
const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, 'utf8'))
const version = tauriConfig.version
const tag = `v${version}`
const bundleRoot = path.join(repoRoot, 'src-tauri', 'target', 'release', 'bundle')
const changelogPath = path.join(repoRoot, 'CHANGELOG.md')

const runGh = (args) =>
  execFileSync('gh', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()

const repoFromOrigin = () => {
  const remoteUrl = runGh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])
  if (remoteUrl) return remoteUrl

  throw new Error('Unable to determine GitHub repository. Set GITHUB_REPOSITORY=owner/repo.')
}

const repo = process.env.GITHUB_REPOSITORY || repoFromOrigin()

const releaseExists = () => {
  try {
    runGh(['release', 'view', tag, '--repo', repo])
    return true
  } catch {
    return false
  }
}

const defaultReleaseNotes = `Release ${tag}`

const releaseNotes = (() => {
  if (!existsSync(changelogPath)) {
    return defaultReleaseNotes
  }

  const changelog = readFileSync(changelogPath, 'utf8')
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sectionPattern = new RegExp(
    `^##\\s+${escapedVersion}(?:\\s+-\\s+.+)?\\r?\\n([\\s\\S]*?)(?=^##\\s+|\\Z)`,
    'm',
  )
  const match = changelog.match(sectionPattern)
  const body = match?.[1]?.trim()

  return body || defaultReleaseNotes
})()

const pickFirstAsset = (dir, matcher) => {
  const entry = readdirSync(dir, { withFileTypes: true })
    .filter((item) => item.isFile() && matcher(item.name))
    .map((item) => path.join(dir, item.name))
    .sort()[0]

  if (!entry) {
    throw new Error(`Expected build artifact not found in ${dir}`)
  }

  return entry
}

const platformKey = (() => {
  if (process.platform === 'win32') {
    if (process.arch === 'x64') return 'windows-x86_64'
    if (process.arch === 'arm64') return 'windows-aarch64'
  }

  if (process.platform === 'darwin') {
    if (process.arch === 'x64') return 'darwin-x86_64'
    if (process.arch === 'arm64') return 'darwin-aarch64'
  }

  throw new Error(`Unsupported updater publish platform: ${process.platform} ${process.arch}`)
})()

const assetForCurrentPlatform = (() => {
  if (process.platform === 'win32') {
    const nsisDir = path.join(bundleRoot, 'nsis')
    const installer = pickFirstAsset(nsisDir, (name) => name.endsWith('-setup.exe'))
    const updater = pickFirstAsset(nsisDir, (name) => name.endsWith('.nsis.zip'))
    const signature = `${updater}.sig`
    if (!existsSync(installer) || !existsSync(updater) || !existsSync(signature)) {
      throw new Error('Windows updater artifacts were not found. Run `npm run build` first.')
    }
    return { installer, updater, signature }
  }

  if (process.platform === 'darwin') {
    const macosDir = path.join(bundleRoot, 'macos')
    const dmgDir = path.join(bundleRoot, 'dmg')
    const updater = pickFirstAsset(macosDir, (name) => name.endsWith('.app.tar.gz'))
    const signature = `${updater}.sig`
    const installer = existsSync(dmgDir) ? pickFirstAsset(dmgDir, (name) => name.endsWith('.dmg')) : updater
    if (!existsSync(updater) || !existsSync(signature)) {
      throw new Error('macOS updater artifacts were not found. Run `npm run build` on a Mac first.')
    }
    return { installer, updater, signature }
  }

  throw new Error(`Unsupported platform: ${process.platform}`)
})()

const tempDir = mkdtempSync(path.join(tmpdir(), 'oneplace-release-'))

try {
  const releaseNotesPath = path.join(tempDir, 'release-notes.md')
  writeFileSync(releaseNotesPath, `${releaseNotes}\n`)

  if (!releaseExists()) {
    runGh([
      'release',
      'create',
      tag,
      '--repo',
      repo,
      '--title',
      `OnePlace ${tag}`,
      '--notes-file',
      releaseNotesPath,
    ])
  } else {
    runGh(['release', 'edit', tag, '--repo', repo, '--notes-file', releaseNotesPath])
  }

  let latest = {
    version,
    notes: releaseNotes,
    pub_date: new Date().toISOString(),
    platforms: {},
  }

  try {
    runGh(['release', 'download', tag, '--repo', repo, '--pattern', 'latest.json', '--dir', tempDir, '--clobber'])
    latest = JSON.parse(readFileSync(path.join(tempDir, 'latest.json'), 'utf8'))
  } catch {
    // First platform to publish for this release.
  }

  latest.version = version
  latest.notes = releaseNotes
  latest.pub_date = new Date().toISOString()
  latest.platforms = {
    ...latest.platforms,
    [platformKey]: {
      signature: readFileSync(assetForCurrentPlatform.signature, 'utf8').trim(),
      url: `https://github.com/${repo}/releases/download/${tag}/${path.basename(assetForCurrentPlatform.updater)}`,
    },
  }

  const latestJsonPath = path.join(tempDir, 'latest.json')
  writeFileSync(latestJsonPath, `${JSON.stringify(latest, null, 2)}\n`)

  const uploadArgs = [
    'release',
    'upload',
    tag,
    assetForCurrentPlatform.installer,
    assetForCurrentPlatform.updater,
    assetForCurrentPlatform.signature,
    latestJsonPath,
    '--repo',
    repo,
    '--clobber',
  ]

  runGh(uploadArgs)
  console.log(`Published updater assets for ${platformKey} to ${repo}@${tag}`)
} finally {
  rmSync(tempDir, { force: true, recursive: true })
}
