import type { Dispatch, KeyboardEvent, SetStateAction } from 'react'
import {
  addMarkmapChild,
  addMarkmapSibling,
  moveMarkmapNode,
  removeMarkmapNode,
  type MarkmapTreeNode,
  updateMarkmapNodeLabel,
} from '../../features/app/markmapFeature'

type MarkmapTreeEditorProps = {
  disabled: boolean
  setTree: Dispatch<SetStateAction<MarkmapTreeNode>>
  tree: MarkmapTreeNode
}

type MarkmapTreeNodeProps = MarkmapTreeEditorProps & {
  isRoot?: boolean
  node: MarkmapTreeNode
}

function MarkmapTreeNodeEditor({ disabled, isRoot = false, node, setTree }: MarkmapTreeNodeProps) {
  const updateLabel = (value: string) => {
    setTree((current) => updateMarkmapNodeLabel(current, node.id, value))
  }

  const addChild = () => {
    setTree((current) => addMarkmapChild(current, node.id))
  }

  const addSibling = () => {
    setTree((current) => addMarkmapSibling(current, node.id))
  }

  const removeNode = () => {
    setTree((current) => removeMarkmapNode(current, node.id))
  }

  const moveNode = (direction: -1 | 1) => {
    setTree((current) => moveMarkmapNode(current, node.id, direction))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (event.ctrlKey || event.metaKey) {
      addChild()
      return
    }
    if (!isRoot) addSibling()
  }

  return (
    <li className="markmap-tree-item">
      <div className={`markmap-tree-node ${isRoot ? 'root' : ''}`}>
        <input
          aria-label={isRoot ? 'Mind map root' : 'Mind map branch'}
          disabled={disabled}
          onChange={(event) => updateLabel(event.target.value)}
          onKeyDown={handleKeyDown}
          type="text"
          value={node.label}
        />
        <div className="markmap-node-controls">
          <button disabled={disabled} onClick={addChild} title="Add child" type="button">
            +
          </button>
          {!isRoot ? (
            <button disabled={disabled} onClick={addSibling} title="Add sibling" type="button">
              =
            </button>
          ) : null}
          {!isRoot ? (
            <>
              <button disabled={disabled} onClick={() => moveNode(-1)} title="Move up" type="button">
                ^
              </button>
              <button disabled={disabled} onClick={() => moveNode(1)} title="Move down" type="button">
                v
              </button>
              <button disabled={disabled} onClick={removeNode} title="Remove" type="button">
                x
              </button>
            </>
          ) : null}
        </div>
      </div>
      {node.children.length > 0 ? (
        <ol className="markmap-tree-children">
          {node.children.map((child) => (
            <MarkmapTreeNodeEditor
              key={child.id}
              disabled={disabled}
              node={child}
              setTree={setTree}
              tree={node}
            />
          ))}
        </ol>
      ) : null}
    </li>
  )
}

export function MarkmapTreeEditor({ disabled, setTree, tree }: MarkmapTreeEditorProps) {
  return (
    <div className="markmap-tree-editor">
      <ol className="markmap-tree-list">
        <MarkmapTreeNodeEditor disabled={disabled} isRoot node={tree} setTree={setTree} tree={tree} />
      </ol>
    </div>
  )
}
