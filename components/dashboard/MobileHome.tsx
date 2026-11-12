"use client";

import { ArrowUpRight, Clock, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useMe } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { WEEKDAYS, dateOfWeekday, fmtTime, todayWeekday } from "@/lib/format";
import { itemVariants, listVariants, snappy, spring } from "@/lib/motion";
import { usePersonal } from "@/lib/personal";
import { useUI } from "@/lib/store";
import type { TaskStatus } from "@/lib/types";
import { useDirection } from "@/lib/useDirection";
import { Avatar, ErrorNote, IconButton, Segmented } from "../ui";
import { LessonTimes, NoteCard, NowBadge, TaskCard, lessonState } from "./parts";
import { LessonSheet, NoteSheet, TaskSheet } from "./sheets";
import { TaskBoard } from "../tasks/TaskBoard";
import { useTeacherWork, type WorkStatus } from "@/lib/useTeacherWork";

type Filter = "all" | TaskStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All task" },
  { value: "todo", label: "To do" },
  { value: "progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning," : h < 18 ? "Good afternoon," : "Good evening,";
};

function SectionTitle({ title, onAdd, label }: { title: string; onAdd: () => void; label: string }) {
  return (
    <div className="mt-8 mb-3 flex items-center justify-between px-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <IconButton size={36} onClick={onAdd} aria-label={label}>
        <Plus className="size-4" />
      </IconButton>
    </div>
  );
}

type WorkFilter = "all" | WorkStatus;

/** Teacher: this week's student work (To do / In progress / Done). */
function MobileWork() {
  return (
    <div className="px-5" data-guide="dashboard-weekly">
      <div className="mt-8 mb-3">
        <h2 className="text-lg font-semibold">Weekly Ongoing Tasks</h2>
        <p className="text-xs text-muted">By subject and section · Done clears every Monday</p>
      </div>
      <div className="rounded-[26px] bg-white p-4">
        <TaskBoard weekly layoutKey="m-weekly" />
      </div>
    </div>
  );
}

export function MobileHome() {
  const me = useMe();
  const { tasks, notes, lessons } = usePersonal();
  const work = useTeacherWork();
  const { openSheet } = useUI();
  const [filter, setFilter] = useState<Filter>("all");
  const [day, setDay] = useState(todayWeekday());
  const dir = useDirection(day);

  const today = lessons.items.filter((l) => l.weekday === todayWeekday());
  const upNext = today.find((l) => lessonState(todayWeekday(), l) !== "past");
  const openCount =
    me.role === "teacher"
      ? work.items.filter((w) => w.status !== "done").length
      : tasks.items.filter((t) => t.status !== "done").length;
  const visibleTasks = tasks.items.filter((t) => filter === "all" || t.status === filter);
  const dayLessons = lessons.items.filter((l) => l.weekday === day);

  const stats = [
    { label: "Open tasks", value: openCount, tone: "bg-lilac-soft text-lilac-deep" },
    { label: "Classes today", value: today.length, tone: "bg-peach/70 text-peach-deep" },
    { label: "Notes", value: notes.items.length, tone: "bg-mint/60 text-mint-deep" },
  ];

  return (
    <motion.div variants={listVariants} initial="hidden" animate="show" className="pb-32">
      {/* Greeting */}
      <motion.div variants={itemVariants} className="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))] pb-5">
        <Avatar name={me.full_name} size={46} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{greeting()}</p>
          <p className="truncate text-xl font-semibold">{me.full_name.split(" ")[0]}</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2.5 px-5">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-[22px] p-3.5 ${s.tone}`}>
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-medium opacity-80">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Up next */}
      {upNext && (
        <motion.button
          variants={itemVariants}
          whileTap={{ scale: 0.97 }}
          onClick={() => openSheet(<LessonSheet lesson={upNext} />)}
          className="mx-5 mt-4 block w-[calc(100%-40px)] rounded-[26px] bg-mint p-5 text-left"
        >
          <div className="flex items-center justify-between">
            {lessonState(todayWeekday(), upNext) === "now" ? (
              <NowBadge />
            ) : (
              <span className="rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-mint-deep">Up next</span>
            )}
            <ArrowUpRight className="size-5" />
          </div>
          <p className="mt-4 text-[22px] font-semibold">{upNext.subject}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/70">
            <Clock className="size-4" /> {fmtTime(upNext.start_time)} – {fmtTime(upNext.end_time)}
            {upNext.room && ` · ${upNext.room}`}
          </p>
        </motion.button>
      )}

      {/* Notes */}
      <SectionTitle title="My notes" label="New note" onAdd={() => openSheet(<NoteSheet />)} />
      <ErrorNote message={notes.error} />
      <motion.div variants={itemVariants} className="no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
        <AnimatePresence initial={false} mode="popLayout">
          {notes.items.map((n) => (
            <NoteCard key={n.id} note={n} className="h-[190px] w-[170px]" />
          ))}
        </AnimatePresence>
        {!notes.loading && notes.items.length === 0 && (
          <button
            onClick={() => openSheet(<NoteSheet />)}
            className="grid h-[150px] w-full place-items-center rounded-[22px] border-2 border-dashed border-ink/10 text-sm text-muted"
          >
            Tap to write your first note
          </button>
        )}
      </motion.div>

      {/* Tasks: teachers get the weekly student-work tracker, admin keeps personal tasks */}
      {me.role === "teacher" ? (
        <MobileWork />
      ) : (
        <>
          <SectionTitle title="My tasks" label="New task" onAdd={() => openSheet(<TaskSheet />)} />
          <Segmented className="px-5" layoutId="m-task-filter" size="md" options={FILTERS} value={filter} onChange={setFilter} />
          <ErrorNote message={tasks.error} />
          <motion.div layout className="mt-3 space-y-3 px-5">
            <AnimatePresence initial={false} mode="popLayout">
              {visibleTasks.map((t, i) => (
                <TaskCard key={t.id} task={t} index={i} />
              ))}
            </AnimatePresence>
            {!tasks.loading && visibleTasks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">{tasks.items.length ? "Nothing here." : "No tasks yet."}</p>
            )}
          </motion.div>
        </>
      )}

      {/* Schedule */}
      <SectionTitle title="My schedule" label="Add class" onAdd={() => openSheet(<LessonSheet defaultWeekday={day} />)} />
      <div className="flex gap-1.5 px-5">
        {WEEKDAYS.map((d, i) => {
          const wd = i + 1;
          const active = wd === day;
          return (
            <motion.button
              key={d}
              whileTap={{ scale: 0.92 }}
              transition={snappy}
              onClick={() => setDay(wd)}
              className={cn(
                "relative flex-1 rounded-2xl py-2 text-center transition-colors duration-200",
                active ? "text-white" : "bg-white text-ink",
              )}
            >
              {active && <motion.span layoutId="m-week" transition={spring} className="absolute inset-0 rounded-2xl bg-lilac" />}
              <span className={cn("relative block text-[11px]", active ? "text-white/85" : "text-muted")}>{d}</span>
              <span className="relative block text-base font-semibold">{dateOfWeekday(wd)}</span>
              {wd === todayWeekday() && (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full",
                    active ? "bg-white" : "bg-lilac",
                  )}
                />
              )}
            </motion.button>
          );
        })}
      </div>
      <ErrorNote message={lessons.error} />
      <div className="relative mt-3 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={day}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 80, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -80, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if ((info.offset.x < -60 || info.velocity.x < -400) && day < 7) setDay(day + 1);
              else if ((info.offset.x > 60 || info.velocity.x > 400) && day > 1) setDay(day - 1);
            }}
            className="space-y-3 px-5"
          >
            {dayLessons.map((l, i) => {
              const state = lessonState(day, l);
              return (
                <motion.button
                  key={l.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openSheet(<LessonSheet lesson={l} />)}
                  className={cn(
                    "flex w-full gap-4 rounded-[26px] p-4 text-left",
                    state === "now" ? "bg-mint" : "bg-white",
                    state === "past" && "opacity-60",
                  )}
                >
                  <LessonTimes l={l} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[17px] font-semibold">{l.subject}</p>
                      {state === "now" && <NowBadge />}
                    </div>
                    {l.room && <p className="mt-0.5 text-sm text-ink/60">{l.room}</p>}
                  </div>
                </motion.button>
              );
            })}
            {!lessons.loading && dayLessons.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">No classes this day. Swipe to see other days.</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
