import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const defaultKeyPath = path.join(homedir(), '.tauri', 'oneplace.key')
const signingKeyPath = process.env.TAURI_SIGNING_PRIVATE_KEY_PATH || defaultKeyPath
const signingKeyFromEnv = process.env.TAURI_SIGNING_PRIVATE_KEY?.trim()
const releaseConfig = JSON.stringify({
  bundle: {
    createUpdaterArtifacts: 'v1Compatible',
  },
})

if (!signingKeyFromEnv && !existsSync(signingKeyPath)) {
  console.error(`Signing key not found at ${signingKeyPath}`)
  console.error(
    'Set TAURI_SIGNING_PRIVATE_KEY or TAURI_SIGNING_PRIVATE_KEY_PATH before building releases.',
  )
  process.exit(1)
}

const signingKey = signingKeyFromEnv || readFileSync(signingKeyPath, 'utf8')

const command =
  process.platform === 'win32'
    ? ['npx.cmd', ['tauri', 'build', '--config', releaseConfig]]
    : ['npx', ['tauri', 'build', '--config', releaseConfig]]

const result = spawnSync(command[0], command[1], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: signingKey,
    ...(existsSync(signingKeyPath) ? { TAURI_SIGNING_PRIVATE_KEY_PATH: signingKeyPath } : {}),
  },
  stdio: 'inherit',
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
