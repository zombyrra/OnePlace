import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const repoRoot = path.resolve(import.meta.dirname, '..')
const appCssPath = path.join(repoRoot, 'src', 'App.css')
const stylesRoot = path.join(repoRoot, 'src', 'styles')
const maxStyleLines = 200
const importPattern = /@import\s+['"]([^'"]+)['"];?/g

const normalizePath = (filePath: string) => path.relative(repoRoot, filePath).replace(/\\/g, '/')

const readCssImports = (filePath: string) => {
  const css = readFileSync(filePath, 'utf8')
  return Array.from(css.matchAll(importPattern), (match) => match[1])
}

const walkCssFiles = (dir: string): string[] =>
  readdirSync(dir)
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry)
      const stats = statSync(fullPath)
      if (stats.isDirectory()) return walkCssFiles(fullPath)
      return entry.endsWith('.css') ? [fullPath] : []
    })
    .sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)))

const resolveCssGraph = (entryPath: string) => {
  const visited = new Set<string>()
  const activeStack: string[] = []
  const imports: string[] = []

  const visit = (filePath: string) => {
    const fullPath = path.resolve(filePath)
    const activeIndex = activeStack.indexOf(fullPath)
    assert.equal(
      activeIndex,
      -1,
      `CSS import cycle: ${[...activeStack.slice(activeIndex), fullPath].map(normalizePath).join(' -> ')}`,
    )
    if (visited.has(fullPath)) return

    visited.add(fullPath)
    activeStack.push(fullPath)
    for (const importPath of readCssImports(fullPath)) {
      assert.match(importPath, /^\.{1,2}\//, `${normalizePath(fullPath)} uses a non-relative CSS import: ${importPath}`)
      const resolvedImport = path.resolve(path.dirname(fullPath), importPath)
      assert.equal(statSync(resolvedImport).isFile(), true, `${normalizePath(fullPath)} imports missing file ${importPath}`)
      imports.push(resolvedImport)
      visit(resolvedImport)
    }
    activeStack.pop()
  }

  visit(entryPath)
  return { imports, visited }
}

test('App CSS import graph resolves every stylesheet exactly once without cycles', () => {
  const graph = resolveCssGraph(appCssPath)
  const styleFiles = walkCssFiles(stylesRoot)
  const expectedFiles = new Set([appCssPath, ...styleFiles].map((filePath) => path.resolve(filePath)))
  const duplicateImports = graph.imports
    .filter((filePath, index) => graph.imports.indexOf(filePath) !== index)
    .map(normalizePath)
    .sort()

  assert.deepEqual(
    duplicateImports,
    [],
    'Stylesheets should not be imported through multiple manifest paths',
  )
  assert.deepEqual(
    [...graph.visited].map(normalizePath).sort(),
    [...expectedFiles].map(normalizePath).sort(),
    'Every stylesheet under src/styles should remain reachable from src/App.css',
  )
})

test('CSS manifest files contain only imports', () => {
  const cssFiles = [appCssPath, ...walkCssFiles(stylesRoot)]
  for (const filePath of cssFiles) {
    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
    if (!lines.some((line) => line.includes('@import'))) continue

    const nonImportLines = lines
      .map((line, index) => ({ index: index + 1, line: line.trim() }))
      .filter(({ line }) => line && !line.startsWith('@import '))

    assert.deepEqual(
      nonImportLines,
      [],
      `${normalizePath(filePath)} mixes @import statements with style rules`,
    )
  }
})

test('split CSS files stay below the oversized-file threshold', () => {
  const oversizedFiles = walkCssFiles(stylesRoot)
    .map((filePath) => ({
      lines: readFileSync(filePath, 'utf8').split(/\r?\n/).filter((_, index, lines) => index < lines.length - 1 || lines[index]).length,
      path: normalizePath(filePath),
    }))
    .filter(({ lines }) => lines > maxStyleLines)

  assert.deepEqual(oversizedFiles, [], `CSS files should stay at or below ${maxStyleLines} lines`)
})
