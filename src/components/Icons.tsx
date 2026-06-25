import type { LucideIcon } from 'lucide-react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDownNarrowWide,
  ArrowLeft,
  Baseline,
  ArrowRight,
  ArrowUpAZ,
  ArrowUpDown,
  AudioLines,
  Bell,
  Bold,
  BookDown,
  BookMarked,
  Cloud,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Captions,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  ClipboardPaste,
  Clock,
  Copy,
  Crosshair,
  Eraser,
  Eye,
  FileDown,
  FilePlus,
  FileStack,
  FileUp,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Highlighter,
  History,
  Image,
  Indent,
  Italic,
  Keyboard,
  LayoutGrid,
  LayoutTemplate,
  LibraryBig,
  Lightbulb,
  Link,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Mail,
  Maximize2,
  Mic,
  MousePointer,
  Network,
  Paintbrush,
  PanelLeft,
  PanelRight,
  Paperclip,
  Pen,
  Pencil,
  Pilcrow,
  Printer,
  Redo2,
  RefreshCcw,
  Replace,
  RotateCcw,
  Save,
  SaveAll,
  ScanSearch,
  Scissors,
  Search,
  SearchX,
  SeparatorHorizontal,
  Settings,
  Share2,
  Smartphone,
  Sparkles,
  Strikethrough,
  Table2,
  Tag,
  Underline,
  Undo2,
  UsersRound,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'

type IconProps = {
  className?: string
  size?: number
}

const Svg = ({
  children,
  className,
  size = 18,
  viewBox = '0 0 24 24',
}: IconProps & { children: ReactNode; viewBox?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height={size}
    viewBox={viewBox}
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    {children}
  </svg>
)

const luc =
  (Icon: LucideIcon, defaultSize = 18) =>
  ({ className, size = defaultSize }: IconProps) => (
    <Icon aria-hidden={true} className={className} size={size} strokeWidth={1.5} />
  )

// ── Coloured custom icons — keep bespoke SVGs for identity ────────────

export const OneNoteLogoIcon = ({ className, size = 18 }: IconProps) => (
  <Svg className={className} size={size}>
    <rect fill="#7719aa" height="20" rx="3" width="20" x="2" y="2" />
    <path d="M8 6.5H16V17.5H8V6.5Z" fill="#8d3dbe" />
    <path d="M6.5 7.5H13.5V16.5H6.5V7.5Z" fill="white" />
    <path d="M8.5 14.8V9.2L11.8 14.8V9.2" stroke="#7719aa" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
  </Svg>
)

export const FolderIcon = ({ className, color = '#d9aa35', size = 18 }: IconProps & { color?: string }) => (
  <Svg className={className} size={size}>
    <path d="M3.5 7.5H9L10.8 5.5H20.5V17.8C20.5 18.7 19.7 19.5 18.8 19.5H5.2C4.3 19.5 3.5 18.7 3.5 17.8V7.5Z" fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
    <path d="M3.5 8.3H20.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
  </Svg>
)

export const PersonIcon = ({ className, color = '#2f9b90', size = 18 }: IconProps & { color?: string }) => (
  <Svg className={className} size={size}>
    <circle cx="12" cy="8.2" fill={color} r="3.2" />
    <path d="M5 18C5.9 14.8 8.5 13 12 13C15.5 13 18.1 14.8 19 18" fill={color} stroke={color} strokeLinecap="round" strokeWidth="1.2" />
  </Svg>
)

export const SectionBookIcon = ({ className, color = '#7e42b3', size = 18 }: IconProps & { color?: string }) => (
  <Svg className={className} size={size}>
    <rect fill={color} height="18" rx="2.2" width="15" x="4.5" y="3" />
    <rect fill="rgba(255,255,255,0.2)" height="18" rx="1.6" width="3" x="7" y="3" />
    <rect fill="white" height="8" opacity="0.85" rx="1" width="6" x="11" y="8" />
  </Svg>
)

export const PasteIcon = luc(ClipboardPaste, 28)

// ── Custom icons kept for unique semantics ────────────────────────────

export const SubpageIcon = ({ className, size = 16 }: IconProps) => (
  <Svg className={className} size={size}>
    <path d="M4 7H15M4 12H13M4 17H15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    <path d="M16 12H20M18 10L20 12L18 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
  </Svg>
)

// A+ / A− glyphs — used for font-size buttons and promote/demote actions
export const TextSizeUpIcon = ({ className, size = 16 }: IconProps) => (
  <Svg className={className} size={size}>
    <path d="M6 18L10.2 6H10.8L15 18M7.4 14H13.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M18.2 7V11.4M16 9.2H20.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
  </Svg>
)

export const TextSizeDownIcon = ({ className, size = 16 }: IconProps) => (
  <Svg className={className} size={size}>
    <path d="M6 18L10.2 6H10.8L15 18M7.4 14H13.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M16.2 9.2H20.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
  </Svg>
)

export const DeleteIcon = ({ className, size = 16 }: IconProps) => (
  <Svg className={className} size={size}>
    <path d="M5 7H19" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    <path d="M9 7V18M15 7V18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    <path d="M7.5 7L8.2 19.2H15.8L16.5 7" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M9.2 4.5H14.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
  </Svg>
)

// ── Lucide-backed icon exports ────────────────────────────────────────

// Navigation / history
export const ChevronDownIcon = luc(ChevronDown, 14)
export const SearchIcon = luc(Search)
export const UndoIcon = luc(Undo2)
export const Redo2Icon = luc(Redo2)
export const ArrowLeftIcon = luc(ArrowLeft)
export const ArrowRightIcon = luc(ArrowRight)
export const RefreshCcwIcon = luc(RefreshCcw)
export const SearchXIcon = luc(SearchX)
export const HistoryIcon = luc(History)
export const RotateCcwIcon = luc(RotateCcw)

// File / notebook operations
export const SaveIcon = luc(Save)
export const SaveAllIcon = luc(SaveAll)
export const FolderPlusIcon = luc(FolderPlus)
export const FilePlusIcon = luc(FilePlus)
export const FileStackIcon = luc(FileStack)
export const FileDownIcon = luc(FileDown)
export const FileUpIcon = luc(FileUp)
export const LibraryBigIcon = luc(LibraryBig)
export const NotebookStackIcon = luc(LibraryBig)
export const BookMarkedIcon = luc(BookMarked)
export const BookDownIcon = luc(BookDown)

// Clipboard / editing
export const CopyIcon = luc(Copy, 16)
export const CutIcon = luc(Scissors, 16)
export const BrushIcon = luc(Paintbrush, 16)
export const EditIcon = luc(Pencil)
export const SettingsIcon = luc(Settings)
export const ReplaceIcon = luc(Replace)
export const KeyboardIcon = luc(Keyboard)

// Text formatting — compact Home ribbon (default size 16)
export const BoldIcon = luc(Bold, 16)
export const ItalicIcon = luc(Italic, 16)
export const UnderlineIcon = luc(Underline, 16)
export const StrikethroughIcon = luc(Strikethrough, 16)
export const BulletsIcon = luc(List, 16)
export const ListOrderedIcon = luc(ListOrdered, 16)
export const IndentIcon = luc(Indent, 16)
export const AlignLeftIcon = luc(AlignLeft, 16)
export const AlignCenterIcon = luc(AlignCenter, 16)
export const AlignRightIcon = luc(AlignRight, 16)
export const AlignJustifyIcon = luc(AlignJustify, 16)
export const PilcrowIcon = luc(Pilcrow, 16)
export const SelectAllIcon = luc(MousePointer, 16)

// Tables / links / media
export const TableIcon = luc(Table2)
export const LinkIcon = luc(Link)
export const Link2Icon = luc(Link2)
export const ImageIcon = luc(Image)
export const AttachmentIcon = luc(Paperclip)

// Insert > Content
export const ListChecksIcon = luc(ListChecks)
export const NetworkIcon = luc(Network)
export const CalendarDaysIcon = luc(CalendarDays)
export const ClockIcon = luc(Clock)
export const CalendarClockIcon = luc(CalendarClock)
export const SeparatorHorizontalIcon = luc(SeparatorHorizontal)

// Insert > Media / capture
export const PrinterIcon = luc(Printer)
export const AudioLinesIcon = luc(AudioLines)
export const MicIcon = luc(Mic)
export const CaptionsIcon = luc(Captions)

// Insert > Meeting Tools / collaboration
export const UsersRoundIcon = luc(UsersRound)
export const MailIcon = luc(Mail)
export const ClipboardListIcon = luc(ClipboardList)
export const LayoutTemplateIcon = luc(LayoutTemplate)
export const SparklesIcon = luc(Sparkles)

// Review / tasks
export const TagsIcon = luc(Tag)
export const CheckSquareIcon = luc(CheckSquare)
export const CalendarCheckIcon = luc(CalendarCheck)
export const CircleCheckIcon = luc(CheckCircle2)

// Draw
export const PenIcon = luc(Pen, 16)
export const BaselineIcon = luc(Baseline, 16)
export const EraserIcon = luc(Eraser)
export const HighlighterIcon = luc(Highlighter)

// View
export const ShowIcon = luc(Eye)
export const SortIcon = luc(ArrowUpDown)
export const SortNewestIcon = luc(ArrowDownNarrowWide)
export const SortAZIcon = luc(ArrowUpAZ)
export const ScanSearchIcon = luc(ScanSearch)
export const PanelLeftIcon = luc(PanelLeft)
export const PanelRightIcon = luc(PanelRight)
export const GripVerticalIcon = luc(GripVertical)
export const CrosshairIcon = luc(Crosshair)
export const WidenPageIcon = luc(Maximize2)

// General list icon
export const ListLinesIcon = luc(List)

// Close / dismiss (side-pane headers, dialogs)
export const CloseIcon = luc(X, 16)

// OneNote-web chrome: header + command bar + nav rail
export const AppGridIcon = luc(LayoutGrid)
export const BellIcon = luc(Bell)
export const CloudIcon = luc(Cloud)
export const LightbulbIcon = luc(Lightbulb, 16)
export const SmartphoneIcon = luc(Smartphone)
export const ShareIcon = luc(Share2, 16)

// Backward-compat aliases — no longer used in RibbonBar but kept for safety
export const InsertFormattingIcon = luc(LayoutTemplate)
export const FormatMotivationIcon = luc(ClipboardList)
export const ProjectIcon = luc(FolderOpen)
