import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  HelpCircle,
  Ruler,
  ThumbsUp,
  Users,
  XOctagon,
} from "lucide-react";
import type { MatchTag } from "@/lib/types";

// Each badge uses an icon, an uppercase label, AND a distinct border style
// so the meaning is never communicated by colour alone (color-blind safe).
const styles: Record<
  MatchTag,
  { cls: string; Icon: typeof CheckCircle2; label: string }
> = {
  "BEST MATCH": {
    cls: "bg-primary text-primary-foreground border-2 border-primary border-double",
    Icon: CheckCircle2,
    label: "BEST MATCH",
  },
  "GOOD MATCH": {
    cls: "bg-primary/15 text-primary border-2 border-primary/60",
    Icon: ThumbsUp,
    label: "GOOD MATCH",
  },
  "CLOSEST MATCH": {
    cls: "bg-accent text-accent-foreground border-2 border-dashed border-foreground/40",
    Icon: HelpCircle,
    label: "CLOSEST MATCH",
  },
  "NEED SIZE": {
    cls: "bg-accent/20 text-accent border-2 border-dashed border-accent",
    Icon: Ruler,
    label: "NEED SIZE",
  },
  "NOT CARRIED": {
    cls: "bg-muted text-muted-foreground border-2 border-foreground/40",
    Icon: Ban,
    label: "NOT CARRIED",
  },
  "OPTIONAL / BORROW": {
    cls: "bg-secondary text-secondary-foreground border-2 border-dashed border-secondary-foreground/40",
    Icon: AlertCircle,
    label: "OPTIONAL / BORROW",
  },
  "ASK STAFF": {
    cls: "bg-secondary text-secondary-foreground border-2 border-dotted border-foreground/50",
    Icon: Users,
    label: "ASK STAFF",
  },
  "SOLD OUT": {
    cls: "bg-destructive text-destructive-foreground border-2 border-foreground/70 line-through decoration-2",
    Icon: XOctagon,
    label: "SOLD OUT",
  },
};

export function MatchBadge({ tag }: { tag: MatchTag }) {
  const { cls, Icon, label } = styles[tag];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${cls}`}
      aria-label={`Status: ${label}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}