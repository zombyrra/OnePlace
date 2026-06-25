import test from 'node:test'
import assert from 'node:assert/strict'
import { hashSecret, verifySecret } from '../src/app/appModel.ts'

test('hashSecret stores salted PBKDF2 hashes instead of reusable SHA-256 digests', async () => {
  const first = await hashSecret('correct horse battery staple')
  const second = await hashSecret('correct horse battery staple')

  assert.match(first, /^pbkdf2-sha256:/)
  assert.match(second, /^pbkdf2-sha256:/)
  assert.notEqual(first, second)
  assert.equal(await verifySecret('correct horse battery staple', first), true)
  assert.equal(await verifySecret('wrong password', first), false)
})

test('verifySecret accepts legacy SHA-256 hashes for existing protected sections', async () => {
  const legacyHash = '6bed82f7da9a703f86f1d89288910edc2681b26d010db89c3666807d364e68a6'

  assert.equal(await verifySecret('legacy-password', legacyHash), true)
  assert.equal(await verifySecret('wrong password', legacyHash), false)
})
