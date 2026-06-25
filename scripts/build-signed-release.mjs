import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'

const defaultKeyPath = path.join(homedir(), '.tauri', 'oneplace.key')
const signingKeyPath = process.env.TAURI_SIGNING_PRIVATE_KEY_PATH || defaultKeyPath
const signingKeyFromEnv = process.env.TAURI_SIGNING_PRIVATE_KEY?.trim()
const signingPassword = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD?.trim()
const releaseConfig = {
  bundle: {
    createUpdaterArtifacts: 'v1Compatible',
  },
}

if (!signingKeyFromEnv && !existsSync(signingKeyPath)) {
  console.error(`Signing key not found at ${signingKeyPath}`)
  console.error(
    'Set TAURI_SIGNING_PRIVATE_KEY or TAURI_SIGNING_PRIVATE_KEY_PATH before building releases.',
  )
  process.exit(1)
}

const signingKey = signingKeyFromEnv || readFileSync(signingKeyPath, 'utf8')
const decodedSigningKey = (() => {
  try {
    return Buffer.from(signingKey.trim(), 'base64').toString('utf8')
  } catch {
    return signingKey
  }
})()

if (
  !signingPassword &&
  (signingKey.includes('encrypted secret key') || decodedSigningKey.includes('encrypted secret key'))
) {
  console.error('The Tauri signing key is encrypted.')
  console.error('Set TAURI_SIGNING_PRIVATE_KEY_PASSWORD before building updater releases.')
  process.exit(1)
}

const command =
  process.platform === 'win32'
    ? ['npx.cmd', ['tauri', 'build', '--config', releaseConfig]]
    : ['npx', ['tauri', 'build', '--config', releaseConfig]]

const tempDir = mkdtempSync(path.join(tmpdir(), 'oneplace-tauri-release-'))
const releaseConfigPath = path.join(tempDir, 'tauri-release.json')

try {
  writeFileSync(releaseConfigPath, `${JSON.stringify(releaseConfig)}\n`)

  command[1][3] = releaseConfigPath

  const result = spawnSync(command[0], command[1], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TAURI_SIGNING_PRIVATE_KEY: signingKey,
      ...(signingPassword ? { TAURI_SIGNING_PRIVATE_KEY_PASSWORD: signingPassword } : {}),
      ...(existsSync(signingKeyPath) ? { TAURI_SIGNING_PRIVATE_KEY_PATH: signingKeyPath } : {}),
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
} finally {
  rmSync(tempDir, { force: true, recursive: true })
}
