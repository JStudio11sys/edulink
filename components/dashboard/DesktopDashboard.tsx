"use client";

import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, LogOut, Plus, Search, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useMe } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { WEEKDAYS_LONG, dateOfWeekday, fmtTime, todayWeekday } from "@/lib/format";
import { itemVariants, listVariants, snappy, spring } from "@/lib/motion";
import { usePersonal } from "@/lib/personal";
import { useUI } from "@/lib/store";
import type { TaskStatus } from "@/lib/types";
import { Avatar, ErrorNote, IconButton, MenuItem, Popover, Segmented } from "../ui";
import { NoteCard, NowBadge, TaskRow, lessonState } from "./parts";
import { TaskBoard } from "../tasks/TaskBoard";
import { useTeacherWork, type WorkStatus } from "@/lib/useTeacherWork";
import { LessonSheet, NoteSheet, TaskSheet } from "./sheets";

type Filter = "all" | TaskStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All task" },
  { value: "todo", label: "To do" },
  { value: "progress", label: "In progress" },
  { value: "done", label: "Done" },
];

function Panel({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 30, delay }}
      className={cn("flex min-h-0 flex-col rounded-card bg-white p-5", className)}
    >
      {children}
    </motion.section>
  );
}

export function DesktopDashboard() {
  const me = useMe();
  const [query, setQuery] = useState("");
  return (
    <div className="grid h-full min-h-[640px] grid-cols-[minmax(340px,5fr)_minmax(0,7fr)] gap-4">
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <TopBar query={query} onQuery={setQuery} />
        {me.role === "teacher" ? <WorkPanel query={query} /> : <TasksPanel query={query} />}
      </div>
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <NotesPanel />
        <SchedulePanel />
      </div>
    </div>
  );
}

/* ---------------- Top bar ---------------- */
function TopBar({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const me = useMe();
  const { signOut } = useAuth();
  const { setPage } = useUI();
  const [searching, setSearching] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="flex items-center gap-2 rounded-card bg-white p-2.5"
    >
      <motion.div
        layout
        transition={spring}
        className="flex h-10 items-center overflow-hidden rounded-full ring-1 ring-line"
        style={{ flex: searching ? 1 : "0 0 40px" }}
      >
        <button
          onClick={() => setSearching(true)}
          className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-soft"
          aria-label="Search tasks"
        >
          <Search className="size-[18px]" />
        </button>
        <AnimatePresence>
          {searching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="flex min-w-0 flex-1 items-center pr-1"
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Search tasks…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <IconButton
                variant="soft"
                size={30}
                onClick={() => {
                  onQuery("");
                  setSearching(false);
                }}
                aria-label="Close search"
              >
                <X className="size-3.5" />
              </IconButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {!searching && (
        <p className="truncate px-1 text-sm text-muted">
          Hi, <span className="font-medium text-ink">{me.full_name.split(" ")[0]}</span>
        </p>
      )}

      <div className="ml-auto">
        <Popover
          className="w-52"
          trigger={({ open, toggle }) => (
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={snappy}
              onClick={toggle}
              className="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-soft"
            >
              <Avatar name={me.full_name} size={36} />
              <span className="hidden text-left leading-tight min-[1180px]:block">
                <span className="block text-[13px] font-medium">{me.full_name}</span>
                <span className="block text-[11px] text-muted capitalize">{me.role}</span>
              </span>
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring}>
                <ChevronDown className="size-4 text-muted" />
              </motion.span>
            </motion.button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                onClick={() => {
                  setPage("profile");
                  close();
                }}
              >
                <User className="size-4" /> My profile
              </MenuItem>
              <div className="my-1 h-px bg-line" />
              <MenuItem danger onClick={signOut}>
                <LogOut className="size-4" /> Log out
              </MenuItem>
            </>
          )}
        </Popover>
      </div>
    </motion.div>
  );
}

/* ---------------- My tasks ---------------- */
function TasksPanel({ query }: { query: string }) {
  const { tasks } = usePersonal();
  const { openSheet } = useUI();
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const q = query.trim().toLowerCase();
  const list = tasks.items.filter(
    (t) =>
      (filter === "all" || t.status === filter) &&
      (!q || t.title.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q)),
  );
  const shown = showAll ? list : list.slice(0, 20);

  return (
    <Panel className="flex-1" delay={0.05}>
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-semibold">My tasks</h2>
        <IconButton onClick={() => openSheet(<TaskSheet />)} aria-label="New task">
          <Plus className="size-[18px]" />
        </IconButton>
      </div>
      <Segmented className="mt-4" layoutId="d-task-filter" options={FILTERS} value={filter} onChange={setFilter} />
      <ErrorNote message={tasks.error} />

      <div className="thin-scroll -mx-2 mt-3 min-h-0 flex-1 overflow-y-auto px-2">
        <motion.ul layout className="relative">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </AnimatePresence>
        </motion.ul>
        {!tasks.loading && list.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-10 text-center">
            <p className="text-sm text-muted">{tasks.items.length ? "Nothing here." : "No tasks yet."}</p>
            {!tasks.items.length && (
              <button onClick={() => openSheet(<TaskSheet />)} className="mt-2 text-sm font-medium text-lilac-deep">
                Add your first task
              </button>
            )}
          </motion.div>
        )}
      </div>

      {list.length > 20 && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAll((s) => !s)}
          className="group mx-auto mt-3 flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium ring-1 ring-line transition-colors hover:bg-soft"
        >
          {showAll ? "Show less" : `View all ${list.length} tasks`}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </motion.button>
      )}
    </Panel>
  );
}

/* ---------------- My tasks (teacher): weekly student-work tracker ---------------- */
type WorkFilter = "all" | WorkStatus;
const WORK_FILTERS: { value: WorkFilter; label: string }[] = [
  { value: "all", label: "All task" },
  { value: "todo", label: "To do" },
  { value: "progress", label: "In progress" },
  { value: "done", label: "Done" },
];

function WorkPanel({ query }: { query: string }) {
  return (
    <Panel className="flex-1" delay={0.05}>
      <h2 className="text-[22px] leading-tight font-semibold">Weekly Ongoing Tasks</h2>
      <p className="mb-3 text-xs text-muted">By subject and section · Done clears every Monday</p>
      <TaskBoard weekly query={query} layoutKey="d-weekly" />
    </Panel>
  );
}

/* ---------------- My notes ---------------- */

/** Horizontal scroller with smooth, eased mouse-wheel gliding and arrow-button state. */
function useSideScroll(itemCount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const frame = useRef(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  /** Ease scrollLeft toward target each frame (fast start, gentle stop). */
  const glide = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    const step = () => {
      const diff = target.current - el.scrollLeft;
      if (Math.abs(diff) < 0.5) {
        el.scrollLeft = target.current;
        frame.current = 0; // finished
        return;
      }
      el.scrollLeft += diff * 0.16;
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, []);

  const moveTo = useCallback(
    (left: number) => {
      const el = ref.current;
      if (!el) return;
      target.current = Math.max(0, Math.min(left, el.scrollWidth - el.clientWidth));
      glide();
    },
    [glide],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    target.current = el.scrollLeft;
    const update = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    const onScroll = () => {
      update();
      // Keep the target in sync when the user drags the scrollbar or swipes a trackpad
      if (!frame.current || Math.abs(target.current - el.scrollLeft) > el.clientWidth) target.current = el.scrollLeft;
    };
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      // Trackpads already scroll sideways smoothly — leave them alone
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        target.current = el.scrollLeft;
        return;
      }
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? el.clientWidth : 1; // lines / pages → px
      if (!frame.current) target.current = el.scrollLeft;
      moveTo(target.current + e.deltaY * unit * 1.2);
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, [itemCount, moveTo]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) moveTo(target.current + dir * el.clientWidth * 0.8);
  };

  return { ref, canLeft, canRight, scrollByPage };
}
function NotesPanel() {
  const { notes } = usePersonal();
  const { openSheet } = useUI();
  const { ref, canLeft, canRight, scrollByPage } = useSideScroll(notes.items.length);
  return (
    <Panel className="h-[310px] shrink-0" delay={0.1}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[22px] font-semibold">My notes</h2>
        <div className="flex items-center gap-2">
          <AnimatePresence initial={false}>
            {(canLeft || canRight) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex gap-1.5"
              >
                <IconButton size={36} onClick={() => scrollByPage(-1)} disabled={!canLeft} aria-label="Previous notes" className="disabled:opacity-30">
                  <ChevronLeft className="size-4" />
                </IconButton>
                <IconButton size={36} onClick={() => scrollByPage(1)} disabled={!canRight} aria-label="Next notes" className="disabled:opacity-30">
                  <ChevronRight className="size-4" />
                </IconButton>
              </motion.div>
            )}
          </AnimatePresence>
          <IconButton onClick={() => openSheet(<NoteSheet />)} aria-label="New note">
            <Plus className="size-[18px]" />
          </IconButton>
        </div>
      </div>
      <ErrorNote message={notes.error} />
      <div
        ref={ref}
        className="thin-scroll -mx-5 mt-4 flex min-h-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain px-5 pt-1 pb-2"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {notes.items.map((n) => (
            <NoteCard key={n.id} note={n} className="w-[190px]" />
          ))}
        </AnimatePresence>
        {!notes.loading && notes.items.length === 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => openSheet(<NoteSheet />)}
            className="grid w-[190px] shrink-0 place-items-center rounded-[22px] border-2 border-dashed border-line text-sm text-muted hover:bg-soft"
          >
            <span className="flex flex-col items-center gap-2">
              <Plus className="size-5" /> Add a note
            </span>
          </motion.button>
        )}
      </div>
    </Panel>
  );
}

/* ---------------- My schedule ---------------- */
function SchedulePanel() {
  const { lessons } = usePersonal();
  const { openSheet } = useUI();
  const [day, setDay] = useState(todayWeekday());
  const list = lessons.items.filter((l) => l.weekday === day);

  return (
    <Panel className="flex-1" delay={0.15}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[22px] font-semibold">My schedule</h2>
        <div className="flex items-center gap-2">
          <Popover
            className="w-48"
            trigger={({ open, toggle }) => (
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={snappy}
                onClick={toggle}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium ring-1 ring-line transition-colors hover:bg-soft"
              >
                {WEEKDAYS_LONG[day - 1].slice(0, 3)}, {dateOfWeekday(day)}
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring}>
                  <ChevronDown className="size-4 text-muted" />
                </motion.span>
              </motion.button>
            )}
          >
            {(close) =>
              WEEKDAYS_LONG.map((d, i) => (
                <MenuItem
                  key={d}
                  onClick={() => {
                    setDay(i + 1);
                    close();
                  }}
                >
                  <span className="flex-1">
                    {d}
                    {i + 1 === todayWeekday() && <span className="ml-1.5 text-xs text-lilac-deep">Today</span>}
                  </span>
                  {i + 1 === day && <Check className="size-4 text-lilac-deep" />}
                </MenuItem>
              ))
            }
          </Popover>
          <IconButton onClick={() => openSheet(<LessonSheet defaultWeekday={day} />)} aria-label="Add class">
            <Plus className="size-[18px]" />
          </IconButton>
        </div>
      </div>
      <ErrorNote message={lessons.error} />

      <div className="mt-4 grid grid-cols-[96px_1.4fr_1fr] gap-3 px-3 text-xs text-muted">
        <span>Time</span>
        <span>Class</span>
        <span>Room</span>
      </div>

      <div className="thin-scroll -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={day}
            variants={listVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
          >
            {list.map((l) => {
              const state = lessonState(day, l);
              return (
                <motion.li key={l.id} variants={itemVariants}>
                  <motion.button
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    transition={snappy}
                    onClick={() => openSheet(<LessonSheet lesson={l} />)}
                    className={cn(
                      "mb-1 grid w-full grid-cols-[96px_1.4fr_1fr] items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px]",
                      state === "now" ? "bg-mint" : "hover:bg-soft",
                      state === "past" && "text-muted",
                    )}
                  >
                    <span className="tabular-nums">{fmtTime(l.start_time)}</span>
                    <span className="truncate font-medium">{l.subject}</span>
                    <span className="flex items-center justify-between gap-2 truncate">
                      {l.room || "—"}
                      {state === "now" && <NowBadge />}
                    </span>
                  </motion.button>
                </motion.li>
              );
            })}
            {!lessons.loading && list.length === 0 && (
              <motion.li variants={itemVariants} className="py-8 text-center">
                <p className="text-sm text-muted">No classes on {WEEKDAYS_LONG[day - 1]}.</p>
                <button
                  onClick={() => openSheet(<LessonSheet defaultWeekday={day} />)}
                  className="mt-2 text-sm font-medium text-lilac-deep"
                >
                  Add a class
                </button>
              </motion.li>
            )}
          </motion.ul>
        </AnimatePresence>
      </div>
    </Panel>
  );
}
