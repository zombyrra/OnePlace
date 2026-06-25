import assert from 'node:assert/strict'
import test from 'node:test'
import { oneNoteShortcutGroups, type ShortcutSupport } from '../src/features/app/oneNoteShortcuts.ts'

const supportedValues = new Set<ShortcutSupport>(['supported', 'partial', 'not-applicable'])

const allShortcuts = oneNoteShortcutGroups.flatMap((group) =>
  group.shortcuts.map((shortcut) => ({ group: group.title, ...shortcut })),
)

test('OneNote shortcut catalog has complete rows', () => {
  assert.ok(oneNoteShortcutGroups.length > 0)

  for (const shortcut of allShortcuts) {
    assert.ok(shortcut.group.trim(), 'group title is required')
    assert.ok(shortcut.action.trim(), `action is required for ${shortcut.group}`)
    assert.ok(shortcut.keys.length > 0, `${shortcut.action} needs at least one key`)
    assert.ok(supportedValues.has(shortcut.support), `${shortcut.action} has a valid support value`)
  }
})

test('OneNote shortcut catalog covers core implemented parity keys', () => {
  const keys = new Set(allShortcuts.flatMap((shortcut) => shortcut.keys))

  for (const key of [
    'Ctrl+N',
    'Ctrl+Alt+N',
    'Ctrl+Alt+Shift+N',
    'Ctrl+T',
    'Ctrl+E',
    'Ctrl+F',
    'Ctrl+Shift+E',
    'Ctrl+Page Down',
    'Ctrl+Page Up',
    'Ctrl+Tab',
    'Ctrl+Shift+Tab',
    'Ctrl+Shift+A',
    'Ctrl+Shift+*',
    'Ctrl+Shift+T',
    'Ctrl+B',
    'Ctrl+.',
    'Ctrl+/',
    'Ctrl+Alt+C',
    'Ctrl+Alt+V',
    'Ctrl+Enter',
    'Ctrl+Alt+R',
    'Ctrl+Alt+E',
    'Alt+Shift+D',
    'Ctrl+Shift+M',
    'Ctrl+Alt+[',
    'Ctrl+Alt+]',
    'Ctrl+Shift+[',
    'Ctrl+Shift+]',
    'Ctrl+1',
    'Ctrl+6',
    'Ctrl+9',
    'Ctrl+0',
    'Ctrl+Alt+A',
    'Ctrl+Alt+P',
    'Ctrl+Alt+S',
    'Ctrl+Alt+Y',
    'Ctrl+Alt+U',
    'Ctrl+Alt+M',
    'Ctrl+Alt+L',
    'Ctrl+Shift+1',
    'Ctrl+Shift+5',
    'Ctrl+Shift+9',
    'Ctrl+Shift+0',
    'Ctrl+Shift+K',
    'Ctrl+Q',
  ]) {
    assert.ok(keys.has(key), `missing ${key}`)
  }
})

test('supported OneNote shortcuts are not assigned to multiple actions', () => {
  const supportedKeys = allShortcuts
    .filter((shortcut) => shortcut.support === 'supported')
    .flatMap((shortcut) => shortcut.keys.map((key) => ({ action: shortcut.action, key })))
  const seen = new Map<string, string>()

  for (const shortcut of supportedKeys) {
    const existingAction = seen.get(shortcut.key)
    assert.equal(existingAction, undefined, `${shortcut.key} is used by both ${existingAction} and ${shortcut.action}`)
    seen.set(shortcut.key, shortcut.action)
  }
})
