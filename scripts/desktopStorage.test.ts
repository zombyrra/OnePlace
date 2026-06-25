import test from 'node:test'
import assert from 'node:assert/strict'
import { createDesktopDataAccess } from '../src/lib/desktop.ts'

test('desktop load errors reject instead of falling back to stale localStorage', async () => {
  const storage = new Map([['oneplace-data', '{"stale":true}']])
  const dataAccess = createDesktopDataAccess({
    invoke: async () => {
      throw new Error('workspace is corrupt')
    },
    isTauriRuntime: () => true,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
    },
  })

  await assert.rejects(() => dataAccess.loadDesktopData(), /workspace is corrupt/)
})

test('browser-only load still uses localStorage fallback', async () => {
  const storage = new Map([['oneplace-data', '{"local":true}']])
  const dataAccess = createDesktopDataAccess({
    invoke: async () => {
      throw new Error('should not call invoke')
    },
    isTauriRuntime: () => false,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
    },
  })

  assert.equal(await dataAccess.loadDesktopData(), '{"local":true}')
})
