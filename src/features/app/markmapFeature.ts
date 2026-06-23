const defaultRootTitle = 'Mind Map'
let markmapNodeCounter = 0

export type MarkmapTreeNode = {
  children: MarkmapTreeNode[]
  id: string
  label: string
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const isMarkdownOutlineLine = (value: string) => /^(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)/.test(value.trim())

const normalizeLine = (value: string) => value.replace(/\s+/g, ' ').trim()

const normalizeNodeLabel = (value: string) => normalizeLine(value).replace(/^(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)/, '').trim()

const createNodeId = () => {
  markmapNodeCounter += 1
  return `markmap-node-${Date.now().toString(36)}-${markmapNodeCounter.toString(36)}`
}

export const createMarkmapTreeNode = (label: string, children: MarkmapTreeNode[] = []): MarkmapTreeNode => ({
  children,
  id: createNodeId(),
  label: normalizeNodeLabel(label) || 'Untitled',
})

export const getMarkmapTitle = (markdown: string) => {
  const heading = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^#\s+/.test(line))

  return heading?.replace(/^#\s+/, '').trim() || defaultRootTitle
}

export const buildMarkmapMarkdownFromText = (title: string, value: string) => {
  const normalizedTitle = normalizeLine(title) || defaultRootTitle
  const trimmed = value.replace(/\r\n?/g, '\n').trim()

  if (!trimmed) {
    return `# ${normalizedTitle}\n\n- Topic\n- Detail\n- Next step`
  }

  if (trimmed.split('\n').some((line) => /^#\s+/.test(line.trim()))) {
    return trimmed
  }

  const lines = trimmed
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean)
    .filter((line) => line.toLowerCase() !== normalizedTitle.toLowerCase())
    .slice(0, 24)

  const outlineLines = lines.length > 0 ? lines : ['Topic', 'Detail', 'Next step']
  const body = outlineLines
    .map((line) => (isMarkdownOutlineLine(line) ? line : `- ${line}`))
    .join('\n')

  return `# ${normalizedTitle}\n\n${body}`
}

const parseOutlineEntry = (line: string) => {
  const heading = line.match(/^(#{1,6})\s+(.+)$/)
  if (heading) {
    return {
      depth: Math.max(0, heading[1].length - 1),
      label: normalizeNodeLabel(heading[2]),
    }
  }

  const bullet = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.+)$/)
  if (bullet) {
    const indent = bullet[1].replace(/\t/g, '  ').length
    return {
      depth: Math.floor(indent / 2) + 1,
      label: normalizeNodeLabel(bullet[2]),
    }
  }

  return null
}

export const createMarkmapTreeFromMarkdown = (markdown: string, fallbackTitle = defaultRootTitle) => {
  const root = createMarkmapTreeNode(getMarkmapTitle(markdown) || fallbackTitle)
  const stack: Array<{ depth: number; node: MarkmapTreeNode }> = [{ depth: 0, node: root }]

  for (const rawLine of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (!rawLine.trim()) continue
    const entry = parseOutlineEntry(rawLine)
    if (!entry?.label) continue

    if (entry.depth === 0) {
      root.label = entry.label
      stack.splice(0, stack.length, { depth: 0, node: root })
      continue
    }

    while (stack.length > 1 && stack[stack.length - 1].depth >= entry.depth) {
      stack.pop()
    }

    const parent = stack[stack.length - 1]?.node ?? root
    const node = createMarkmapTreeNode(entry.label)
    parent.children.push(node)
    stack.push({ depth: entry.depth, node })
  }

  if (root.children.length === 0) {
    root.children.push(createMarkmapTreeNode('Topic'), createMarkmapTreeNode('Detail'), createMarkmapTreeNode('Next step'))
  }

  return root
}

export const serializeMarkmapTreeToMarkdown = (tree: MarkmapTreeNode) => {
  const serializeChildren = (children: MarkmapTreeNode[], depth: number): string[] =>
    children.flatMap((child) => {
      const indent = '  '.repeat(depth)
      const label = normalizeNodeLabel(child.label) || 'Untitled'
      return [`${indent}- ${label}`, ...serializeChildren(child.children, depth + 1)]
    })

  const title = normalizeNodeLabel(tree.label) || defaultRootTitle
  const body = serializeChildren(tree.children, 0)
  return body.length > 0 ? `# ${title}\n\n${body.join('\n')}` : `# ${title}`
}

export const countMarkmapTreeNodes = (tree: MarkmapTreeNode): number =>
  1 + tree.children.reduce((total, child) => total + countMarkmapTreeNodes(child), 0)

const mapMarkmapTree = (
  node: MarkmapTreeNode,
  targetId: string,
  mapper: (node: MarkmapTreeNode) => MarkmapTreeNode,
): MarkmapTreeNode => {
  if (node.id === targetId) return mapper(node)
  return {
    ...node,
    children: node.children.map((child) => mapMarkmapTree(child, targetId, mapper)),
  }
}

export const updateMarkmapNodeLabel = (tree: MarkmapTreeNode, nodeId: string, label: string) =>
  mapMarkmapTree(tree, nodeId, (node) => ({
    ...node,
    label: normalizeNodeLabel(label),
  }))

export const addMarkmapChild = (tree: MarkmapTreeNode, parentId: string, label = 'New branch') =>
  mapMarkmapTree(tree, parentId, (node) => ({
    ...node,
    children: [...node.children, createMarkmapTreeNode(label)],
  }))

const addSiblingInChildren = (children: MarkmapTreeNode[], nodeId: string, label: string): MarkmapTreeNode[] => {
  const nextChildren: MarkmapTreeNode[] = []
  for (const child of children) {
    nextChildren.push({
      ...child,
      children: addSiblingInChildren(child.children, nodeId, label),
    })
    if (child.id === nodeId) {
      nextChildren.push(createMarkmapTreeNode(label))
    }
  }
  return nextChildren
}

export const addMarkmapSibling = (tree: MarkmapTreeNode, nodeId: string, label = 'New branch') => {
  if (tree.id === nodeId) return addMarkmapChild(tree, tree.id, label)
  return {
    ...tree,
    children: addSiblingInChildren(tree.children, nodeId, label),
  }
}

const removeNodeFromChildren = (children: MarkmapTreeNode[], nodeId: string): MarkmapTreeNode[] =>
  children
    .filter((child) => child.id !== nodeId)
    .map((child) => ({
      ...child,
      children: removeNodeFromChildren(child.children, nodeId),
    }))

export const removeMarkmapNode = (tree: MarkmapTreeNode, nodeId: string) => {
  if (tree.id === nodeId) return tree
  return {
    ...tree,
    children: removeNodeFromChildren(tree.children, nodeId),
  }
}

const moveNodeInChildren = (
  children: MarkmapTreeNode[],
  nodeId: string,
  direction: -1 | 1,
): MarkmapTreeNode[] => {
  const index = children.findIndex((child) => child.id === nodeId)
  if (index >= 0) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= children.length) return children
    const nextChildren = [...children]
    const [node] = nextChildren.splice(index, 1)
    nextChildren.splice(targetIndex, 0, node)
    return nextChildren
  }

  return children.map((child) => ({
    ...child,
    children: moveNodeInChildren(child.children, nodeId, direction),
  }))
}

export const moveMarkmapNode = (tree: MarkmapTreeNode, nodeId: string, direction: -1 | 1) => ({
  ...tree,
  children: moveNodeInChildren(tree.children, nodeId, direction),
})

export const encodeMarkmapMarkdown = (markdown: string) => encodeURIComponent(markdown.replace(/\r\n?/g, '\n').trim())

export const decodeMarkmapMarkdown = (encoded: string) => {
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

export const buildMarkmapCardMarkup = (markdown: string) => {
  const normalizedMarkdown = markdown.replace(/\r\n?/g, '\n').trim() || buildMarkmapMarkdownFromText(defaultRootTitle, '')
  const title = getMarkmapTitle(normalizedMarkdown)
  const encodedMarkdown = encodeMarkmapMarkdown(normalizedMarkdown)

  return `
    <section class="markmap-card" contenteditable="false" data-markmap-markdown="${escapeHtml(encodedMarkdown)}">
      <div class="markmap-card-head">
        <strong>${escapeHtml(title)}</strong>
        <span>Interactive mind map</span>
      </div>
      <div class="markmap-fallback">
        <pre><code>${escapeHtml(normalizedMarkdown)}</code></pre>
      </div>
    </section>
    <p><br /></p>
  `.trim()
}
