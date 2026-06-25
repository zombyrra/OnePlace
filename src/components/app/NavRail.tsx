import { LibraryBigIcon, SearchIcon, SmartphoneIcon } from '../Icons'

type NavRailProps = {
  isNotebookPaneVisible: boolean
  onShowLibrary: () => void
  onFocusSearch: () => void
}

/* OneNote-web vertical nav rail — the signature purple spine. Library
   toggles the notebook pane; search focuses the command-bar search box. */
export function NavRail({ isNotebookPaneVisible, onShowLibrary, onFocusSearch }: NavRailProps) {
  return (
    <nav className="op-rail" aria-label="Navigation">
      <div className="op-rail-top">
        <button
          aria-label="Notebooks"
          className={`op-rail-btn ${isNotebookPaneVisible ? 'is-active' : ''}`.trim()}
          onClick={onShowLibrary}
          title="Notebooks"
          type="button"
        >
          <LibraryBigIcon size={22} />
        </button>
        <button aria-label="Search" className="op-rail-btn" onClick={onFocusSearch} title="Search" type="button">
          <SearchIcon size={20} />
        </button>
      </div>
      <div className="op-rail-bottom">
        <button aria-label="Mobile app" className="op-rail-btn" title="Get the mobile app" type="button">
          <SmartphoneIcon size={20} />
        </button>
      </div>
    </nav>
  )
}
