import {
  BookOpen,
  Bookmark,
  Store,
  ArrowRight,
  BarChart3,
  Code2,
  Layers,
  Link2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings2,
  Users,
  X,
  Lightbulb,
  Search,
  Plus,
  Clock3,
  Check,
  AlertCircle,
  UserRound,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Play,
  Grid2X2,
  Swords,
  MessageSquare,
} from 'lucide-react';
const icons = {
  knowledge: BookOpen,
  bookmark: Bookmark,
  marketplace: Store,
  overview: LayoutDashboard,
  skills: BarChart3,
  layers: Layers,
  practice: Code2,
  users: Users,
  links: Link2,
  chat: MessageSquare,
  arrow: ArrowRight,
  menu: Menu,
  close: X,
  refresh: RefreshCw,
  settings: Settings2,
  collapse: PanelLeftClose,
  expand: PanelLeftOpen,
  hint: Lightbulb,
  search: Search,
  plus: Plus,
  clock: Clock3,
  check: Check,
  alert: AlertCircle,
  user: UserRound,
  logout: LogOut,
  chevron: ChevronDown,
  play: Play,
  grid: Grid2X2,
  battle: Swords,
  discuss: MessageSquare,
};
export function WorkspaceIcon({
  name,
  size = 18,
}: {
  name: keyof typeof icons;
  size?: number;
}) {
  const Icon = icons[name];
  return (
    <Icon
      size={Math.max(16, Math.min(20, size))}
      strokeWidth={1.5}
      aria-hidden="true"
      focusable="false"
    />
  );
}
