import {
  Building2,
  CalendarCheck,
  CalendarDays,
  Columns2,
  IdCard,
  Image,
  Landmark,
  ListOrdered,
  MessageSquareText,
  Minus,
  MoveVertical,
  PanelBottom,
  PenLine,
  Receipt,
  ShieldCheck,
  Square,
  StickyNote,
  Table,
  Trophy,
  Type,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Building2,
  CalendarCheck,
  CalendarDays,
  Columns2,
  IdCard,
  Image,
  Landmark,
  ListOrdered,
  MessageSquareText,
  Minus,
  MoveVertical,
  PanelBottom,
  PenLine,
  Receipt,
  ShieldCheck,
  StickyNote,
  Table,
  Trophy,
  Type,
};

/** The icon the backend names for a section type (a square if unknown). */
export function BlockIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Square;
  return <Icon size={size} />;
}
