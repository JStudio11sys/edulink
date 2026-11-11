"use client";

import {
  BookOpen,
  CheckCheck,
  MessageSquare,
  Calculator,

  ChevronRight,
  Dumbbell,
  FlaskConical,
  Globe,
  Languages,
  Monitor,
  Music,
  Palette,
  Ruler,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import { snappy, spring } from "@/lib/motion";
import { getReview, markActivityOpened } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useQuery } from "@/lib/useQuery";
import { useUI } from "@/lib/store";
import { statusLabel, type StudentActivity } from "@/lib/useStudent";
import { SheetHeader } from "../Sheet";
import { SubmissionView } from "../SubmissionView";
import { Pill, SubjectChip, subjectColor } from "../ui";
import { SubmitFlow } from "./SubmitFlow";
import { TestSummary } from "../TestSummary";


/** A friendly icon per subject, picked from its name. */
export function subjectIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (/math|algebra|geometry|calculus|statistic/.test(n)) return n.includes("geometry") ? Ruler : Calculator;
  if (/science|biology|chem|physic|lab/.test(n)) return FlaskConical;
  if (/art|draw|paint|design/.test(n)) return Palette;
  if (/computer|ict|coding|program|tech/.test(n)) return Monitor;
  if (/social|history|geograph|araling|civic/.test(n)) return Globe;
  if (/music|mapeh/.test(n)) return Music;
  if (/p\.?e\.?\b|physical|sport|health/.test(n)) return Dumbbell;
  if (/filipino|spanish|french|language|mandarin/.test(n)) return Languages;
  return BookOpen;
}

/** Small colored square with the subject's icon (as in the sample design). */
export function SubjectIcon({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const Icon = subjectIcon(name);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center text-ink",
        subjectColor(name).icon,
        size === "sm" ? "size-9 rounded-xl" : "size-11 rounded-2xl",
      )}
    >
      <Icon className={size === "sm" ? "size-[18px]" : "size-5"} />
    </span>
  );
}

/** White tile: icon square on top, title, small caption. */
export function Tile({
  icon,
  title,
  caption,
  onClick,
  index = 0,
}: {
  icon: ReactNode;
  title: string;
  caption?: string;
  onClick?: () => void;
  index?: number;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...spring, delay: Math.min(index, 8) * 0.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="rounded-[22px] bg-white p-3.5 text-left"
    >
      {icon}
      <p className="mt-2.5 truncate text-sm font-semibold">{title}</p>
      {caption && <p className="truncate text-xs text-muted">{caption}</p>}
    </motion.button>
  );
}

export function useOpenActivity() {
  const { openSheet, bumpData } = useUI();
  return (item: StudentActivity) => {
    // First time opening an unsubmitted activity → it becomes "In progress".
    if (!item.submission && !item.started)
      markActivityOpened(item.activity.id)
        .then(bumpData)
        .catch(() => {});
    openSheet(<ActivitySheet item={{ ...item, started: true }} />);
  };
}

/** List row like the sample's "Upcoming activities". */
export function ActivityRow({
  item,
  index = 0,
  ref,
}: {
  item: StudentActivity;
  index?: number;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const open = useOpenActivity();
  const { activity, status } = item;
  return (
    <motion.button
      ref={ref}
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { ...spring, delay: Math.min(index, 8) * 0.04 } }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      transition={snappy}
      onClick={() => open(item)}
      className="flex w-full items-center gap-3 rounded-[22px] bg-white p-3.5 text-left"
    >
      <SubjectIcon name={item.subject} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={cn("truncate font-semibold", status === "submitted" && "text-ink/60")}>{activity.title}</p>
          <span className={cn("shrink-0 text-[11px]", status === "overdue" ? "font-medium text-red-500" : "text-muted")}>
            {activity.due_at ? fmtDate(activity.due_at) : ""}
          </span>
        </div>
        <p className="truncate text-[13px] text-muted">
          {item.subject}
          {item.teacher ? ` · ${item.teacher}` : ""}
        </p>
      </div>
      <Pill tone={statusLabel(item).tone}>{statusLabel(item).label}</Pill>
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </motion.button>
  );
}

/** Detail sheet: instructions, then either the locked submission or the submit button. */
export function ActivitySheet({ item }: { item: StudentActivity }) {
  const me = useMe();
  const { activity, submission } = item;
  return (
    <div className="pt-1">
      <div className="flex items-center gap-2">
        <SubjectChip name={item.subject} />
        <Pill tone={statusLabel(item).tone}>{statusLabel(item).label}</Pill>
      </div>
      <div className="mt-3">
        <SheetHeader
          title={activity.title}
          subtitle={[item.teacher, activity.due_at ? `Due ${fmtDate(activity.due_at)}` : null].filter(Boolean).join(" · ")}
        />
      </div>
      {activity.instructions && (
        <p className="-mt-1 mb-5 rounded-2xl bg-soft p-4 text-[15px] leading-relaxed whitespace-pre-wrap">
          {activity.instructions}
        </p>
      )}

      <TestSummary parts={activity.parts} className="mb-5" />

      <TeacherFeedback activityId={activity.id} teacher={item.teacher} />

      {submission ? (
        <SubmissionView submission={submission} />
      ) : (
        <SubmitFlow activityId={activity.id} studentId={item.submission?.student_id ?? me.id} />
      )}
    </div>
  );
}

/** The teacher's comment and "Checked" mark, if any. */
function TeacherFeedback({ activityId, teacher }: { activityId: string; teacher?: string }) {
  const me = useMe();
  const { data: review } = useQuery(() => getReview(activityId, me.id), [activityId]);
  if (!review || (!review.comment && !review.checked)) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 rounded-[22px] bg-lilac-soft p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-lilac-deep">
          <MessageSquare className="size-4" /> {teacher ? `${teacher}'s comment` : "Teacher's comment"}
        </p>
        {review.checked && (
          <span className="flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium text-white">
            <CheckCheck className="size-3" /> Checked
          </span>
        )}
      </div>
      {review.comment ? (
        <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-ink-2">{review.comment}</p>
      ) : (
        <p className="mt-2 text-sm text-ink-2">Your teacher has checked your work.</p>
      )}
    </motion.div>
  );
}
