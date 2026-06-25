export type ShortcutSupport = 'supported' | 'partial' | 'not-applicable'

export type OneNoteShortcut = {
  action: string
  keys: string[]
  note?: string
  support: ShortcutSupport
}

export type OneNoteShortcutGroup = {
  title: string
  shortcuts: OneNoteShortcut[]
}

export const oneNoteShortcutReferenceUrl =
  'https://support.microsoft.com/en-us/accessibility/onenote/keyboard-shortcuts-in-onenote'

export const oneNoteShortcutGroups: OneNoteShortcutGroup[] = [
  {
    title: 'Create And File',
    shortcuts: [
      { action: 'New page at end of section', keys: ['Ctrl+N'], support: 'supported' },
      { action: 'New page below current page', keys: ['Ctrl+Alt+N'], support: 'supported' },
      { action: 'New subpage below current page', keys: ['Ctrl+Alt+Shift+N'], support: 'supported' },
      { action: 'Create a section', keys: ['Ctrl+T'], support: 'supported' },
      { action: 'Open a notebook', keys: ['Ctrl+O'], support: 'supported' },
      { action: 'Sync/save notebook', keys: ['Ctrl+S', 'Shift+F9', 'F9'], support: 'supported' },
      { action: 'Print current page', keys: ['Ctrl+P'], support: 'supported' },
      { action: 'Email current page', keys: ['Ctrl+Shift+E'], support: 'supported' },
      {
        action: 'New OneNote window',
        keys: ['Ctrl+M'],
        note: 'OnePlace runs as one workspace window today.',
        support: 'not-applicable',
      },
    ],
  },
  {
    title: 'Type And Edit',
    shortcuts: [
      { action: 'Undo or redo', keys: ['Ctrl+Z', 'Ctrl+Y'], support: 'supported' },
      { action: 'Select all page content', keys: ['Ctrl+A'], support: 'supported' },
      { action: 'Cut, copy, or paste', keys: ['Ctrl+X', 'Ctrl+C', 'Ctrl+V'], support: 'supported' },
      { action: 'Paste text only', keys: ['Ctrl+Shift+V'], support: 'supported' },
      { action: 'Move to beginning or end of line', keys: ['Home', 'End'], support: 'supported' },
      { action: 'Move one word left or right', keys: ['Ctrl+Left', 'Ctrl+Right'], support: 'supported' },
      { action: 'Delete character or word', keys: ['Backspace', 'Delete', 'Ctrl+Backspace', 'Ctrl+Delete'], support: 'supported' },
      { action: 'Insert line break', keys: ['Shift+Enter'], support: 'supported' },
      { action: 'Open context menu', keys: ['Shift+F10', 'Menu'], support: 'supported' },
      {
        action: 'Spelling and thesaurus',
        keys: ['F7', 'Shift+F7'],
        note: 'OnePlace relies on browser spellcheck and does not include a thesaurus pane.',
        support: 'partial',
      },
      {
        action: 'Information bar action',
        keys: ['Ctrl+Shift+W'],
        note: 'OnePlace has no OneNote-style information bar.',
        support: 'not-applicable',
      },
    ],
  },
  {
    title: 'Navigate And Search',
    shortcuts: [
      { action: 'Search all notebooks', keys: ['Ctrl+E'], support: 'supported' },
      { action: 'Find on current page', keys: ['Ctrl+F', 'Enter (find)', 'F3', 'Shift+F3', 'Esc (find)'], support: 'supported' },
      { action: 'Preview/open all-notebook search results', keys: ['Down (search)', 'Enter (search)', 'Esc (search)'], support: 'supported' },
      { action: 'Change search scope', keys: ['Ctrl+E, Tab'], support: 'supported' },
      { action: 'Focus notebook navigation', keys: ['Ctrl+G'], support: 'supported' },
      { action: 'Focus current section', keys: ['Ctrl+Shift+G', 'Ctrl+Alt+Shift+O'], support: 'supported' },
      { action: 'Focus current page tab', keys: ['Ctrl+Alt+G'], support: 'supported' },
      { action: 'Select current page', keys: ['Ctrl+Shift+A'], support: 'supported' },
      { action: 'Expand or collapse current page group', keys: ['Ctrl+Shift+*'], support: 'supported' },
      { action: 'Select page title', keys: ['Ctrl+Shift+T'], support: 'supported' },
      { action: 'Next/previous page', keys: ['Ctrl+Page Down', 'Ctrl+Page Up'], support: 'supported' },
      { action: 'Next/previous section', keys: ['Ctrl+Tab', 'Ctrl+Shift+Tab'], support: 'supported' },
      { action: 'First/last page in section', keys: ['Alt+Home', 'Alt+End', 'Alt+Page Up', 'Alt+Page Down'], support: 'supported' },
      { action: 'Back/forward visited pages', keys: ['Alt+Left', 'Alt+Right'], support: 'supported' },
      { action: 'Full-page view', keys: ['F11'], support: 'supported' },
      {
        action: 'Quick Note',
        keys: ['Ctrl+Shift+M', 'Alt+Windows+N'],
        note: 'OnePlace keeps quick capture inside the current workspace.',
        support: 'not-applicable',
      },
      {
        action: 'Dock the OneNote window',
        keys: ['Ctrl+Alt+D'],
        note: 'Docking is a OneNote desktop window mode.',
        support: 'not-applicable',
      },
    ],
  },
  {
    title: 'Format Notes',
    shortcuts: [
      { action: 'Bold, italic, underline', keys: ['Ctrl+B', 'Ctrl+I', 'Ctrl+U'], support: 'supported' },
      { action: 'Strikethrough', keys: ['Ctrl+-', 'Alt+-'], support: 'supported' },
      { action: 'Superscript/subscript', keys: ['Ctrl+Shift+=', 'Ctrl+='], support: 'supported' },
      { action: 'Bulleted/numbered list', keys: ['Ctrl+.', 'Ctrl+/'], support: 'supported' },
      { action: 'Heading 1-6', keys: ['Ctrl+Alt+1..6'], support: 'supported' },
      { action: 'Normal style / clear formatting', keys: ['Ctrl+Shift+N'], support: 'supported' },
      { action: 'Highlight selected text', keys: ['Ctrl+Shift+H', 'Ctrl+Alt+H'], support: 'supported' },
      { action: 'Left/right align paragraph', keys: ['Ctrl+L', 'Ctrl+R'], support: 'supported' },
      { action: 'Increase/decrease font size', keys: ['Ctrl+Shift+>', 'Ctrl+Shift+<'], support: 'supported' },
      { action: 'Increase/decrease paragraph indent', keys: ['Alt+Shift+Right', 'Alt+Shift+Left'], support: 'supported' },
      { action: 'Format Painter copy/paste formatting', keys: ['Ctrl+Alt+C', 'Ctrl+Alt+V'], support: 'supported' },
    ],
  },
  {
    title: 'Insert And Page',
    shortcuts: [
      { action: 'Insert hyperlink', keys: ['Ctrl+K'], support: 'supported' },
      { action: 'Insert date, date/time, or time', keys: ['Alt+Shift+D', 'Alt+Shift+F', 'Alt+Shift+T'], support: 'supported' },
      { action: 'Insert author and timestamp', keys: ['Ctrl+Shift+M'], support: 'supported' },
      { action: 'Show or hide rule lines', keys: ['Ctrl+Shift+R'], support: 'supported' },
      { action: 'Move selected page up/down', keys: ['Alt+Shift+Up', 'Alt+Shift+Down'], support: 'supported' },
      { action: 'Increase/decrease page indent', keys: ['Ctrl+Alt+[', 'Ctrl+Alt+]'], support: 'supported' },
      { action: 'Increase/decrease page navigation width', keys: ['Ctrl+Shift+[', 'Ctrl+Shift+]'], support: 'supported' },
      {
        action: 'Zoom in/out',
        keys: ['Ctrl+Plus / Ctrl+Minus outside text', 'Ctrl+Alt+Shift+=', 'Ctrl+Alt+Shift+-', 'Ctrl+Alt+Numpad +', 'Ctrl+Alt+Numpad -'],
        support: 'supported',
      },
      { action: 'Move or copy current page', keys: ['Ctrl+Alt+M'], support: 'supported' },
      {
        action: 'Insert files, printouts, pictures, stickers, and screen clippings',
        keys: ['Alt+N, F', 'Alt+N, O', 'Alt+N, P', 'Alt+N, S', 'Windows+Shift+S, Ctrl+V'],
        note: 'OnePlace supports file, printout, image, and clipboard insertion through its Insert ribbon and paste flow.',
        support: 'partial',
      },
      {
        action: 'Start a math equation',
        keys: ['Alt+='],
        note: 'Math equation conversion is not currently an editor feature.',
        support: 'not-applicable',
      },
    ],
  },
  {
    title: 'Audio',
    shortcuts: [
      { action: 'Create a new audio recording', keys: ['Ctrl+Alt+A'], support: 'supported' },
      { action: 'Play selected audio recording', keys: ['Ctrl+Alt+P'], support: 'supported' },
      { action: 'Stop audio recording or playback', keys: ['Ctrl+Alt+S'], support: 'supported' },
      { action: 'Skip audio backward/forward 10 seconds', keys: ['Ctrl+Alt+Y', 'Ctrl+Alt+U'], support: 'supported' },
    ],
  },
  {
    title: 'Work With Tables',
    shortcuts: [
      { action: 'Move to next cell, creating a row at the end', keys: ['Tab'], support: 'supported' },
      { action: 'Move to previous cell', keys: ['Shift+Tab'], support: 'supported' },
      { action: 'Create another row at the end or above the current row', keys: ['Enter at row start/end'], support: 'supported' },
      { action: 'Insert row below', keys: ['Ctrl+Enter'], support: 'supported' },
      { action: 'Insert column to the right', keys: ['Ctrl+Alt+R'], support: 'supported' },
      { action: 'Insert column to the left', keys: ['Ctrl+Alt+E'], support: 'supported' },
      { action: 'New paragraph in current cell', keys: ['Alt+Enter'], support: 'supported' },
      { action: 'Delete empty current row', keys: ['Delete, Delete'], support: 'supported' },
    ],
  },
  {
    title: 'Tags, Tasks, And Protection',
    shortcuts: [
      { action: 'Toggle To Do', keys: ['Ctrl+1'], support: 'supported' },
      { action: 'Toggle Important', keys: ['Ctrl+2'], support: 'supported' },
      { action: 'Toggle Question', keys: ['Ctrl+3'], support: 'supported' },
      { action: 'Toggle Remember for later', keys: ['Ctrl+4'], support: 'supported' },
      { action: 'Toggle Definition', keys: ['Ctrl+5'], support: 'supported' },
      { action: 'Toggle Highlight', keys: ['Ctrl+6'], support: 'supported' },
      { action: 'Toggle Contact', keys: ['Ctrl+7'], support: 'supported' },
      { action: 'Toggle Address', keys: ['Ctrl+8'], support: 'supported' },
      { action: 'Toggle Phone number', keys: ['Ctrl+9'], support: 'supported' },
      { action: 'Clear tags', keys: ['Ctrl+0'], support: 'supported' },
      {
        action: 'Create Outlook-style task dates',
        keys: ['Ctrl+Shift+1', 'Ctrl+Shift+2', 'Ctrl+Shift+3', 'Ctrl+Shift+4', 'Ctrl+Shift+5'],
        support: 'supported',
      },
      { action: 'Open, complete, or delete current task', keys: ['Ctrl+Shift+K', 'Ctrl+Shift+9', 'Ctrl+Shift+0'], support: 'supported' },
      { action: 'Mark current page unread', keys: ['Ctrl+Q'], support: 'supported' },
      { action: 'Lock protected sections', keys: ['Ctrl+Alt+L'], support: 'supported' },
    ],
  },
  {
    title: 'Outlines And Language',
    shortcuts: [
      {
        action: 'Collapse or expand outline levels',
        keys: ['Alt+Shift+1..9', 'Alt+Shift+0', 'Alt+Shift+=', 'Alt+Shift+-'],
        note: 'OnePlace has page-group collapse, but not OneNote outline level commands.',
        support: 'partial',
      },
      {
        action: 'Left-to-right or right-to-left writing direction',
        keys: ['Ctrl+Left Shift', 'Ctrl+Right Shift'],
        note: 'Writing direction follows the browser and operating system.',
        support: 'not-applicable',
      },
    ],
  },
]
