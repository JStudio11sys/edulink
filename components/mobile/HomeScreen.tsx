"use client";

import { ArrowUpRight, Clock, Plus } from "lucide-react";
import { motion } from "motion/react";
import { SCHEDULE, STUDENT, TODAY, formatTime, lessonState } from "@/lib/data";
import { itemVariants, listVariants, snappy } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { NoteCard } from "../NoteCard";
import { Notifications } from "../Notifications";
import { Avatar, ProgressBar, StatusPill } from "../ui";

export function HomeScreen() {
  const { tasks, notes, openSheet, setTab, setDay } = useStore();
  const today = SCHEDULE[TODAY];
  const current = today.find((l) => lessonState(TODAY, l) !== "past");
  const open = tasks.filter((t) => t.status !== "done");
  const inProgress = tasks.filter((t) => t.status === "progress");

  const stats = [
    { label: "Open tasks", value: open.length, tone: "bg-lilac-soft text-lilac-deep" },
    { label: "Classes today", value: today.length, tone: "bg-peach/70 text-peach-deep" },
    { label: "Notes", value: notes.length, tone: "bg-mint/60 text-mint-deep" },
  ];

  return (
    <motion.div variants={listVariants} initial="hidden" animate="show">
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))] pb-5"
      >
        <Avatar name={STUDENT.name} size={46} />
        <div className="flex-1">
          <p className="text-sm text-muted">Good morning,</p>
          <p className="text-xl font-semibold">{STUDENT.first}</p>
        </div>
        <Notifications />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2.5 px-5">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-[22px] p-3.5 ${s.tone}`}>
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-medium opacity-80">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {current && (
        <motion.button
          variants={itemVariants}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setDay(TODAY);
            setTab("schedule");
          }}
          className="mx-5 mt-4 block w-[calc(100%-40px)] rounded-[26px] bg-mint p-5 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-mint-deep">
              <motion.span
                className="size-1.5 rounded-full bg-mint-deep"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
              />
              {lessonState(TODAY, current) === "now" ? "Happening now" : "Up next"}
            </span>
            <ArrowUpRight className="size-5" />
          </div>
          <p className="mt-4 text-[22px] font-semibold">{current.subject}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/70">
            <Clock className="size-4" /> {formatTime(current.start)} – {formatTime(current.end)} · {current.building},{" "}
            {current.room}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Avatar name={current.teacher} size={26} /> {current.teacher}
          </div>
        </motion.button>
      )}

      <motion.div variants={itemVariants} className="mt-7 flex items-center justify-between px-5">
        <h2 className="text-lg font-semibold">My notes</h2>
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={snappy}
          onClick={() => openSheet({ kind: "newNote" })}
          className="grid size-9 place-items-center rounded-full bg-white ring-1 ring-line"
          aria-label="New note"
        >
          <Plus className="size-4" />
        </motion.button>
      </motion.div>
      <motion.div
        variants={itemVariants}
        className="no-scrollbar mt-3 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1"
      >
        {notes.map((n) => (
          <NoteCard key={n.id} note={n} className="h-[190px] w-[170px]" />
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="mt-7 flex items-center justify-between px-5">
        <h2 className="text-lg font-semibold">Continue working</h2>
        <button onClick={() => setTab("tasks")} className="text-sm font-medium text-lilac-deep">
          See all
        </button>
      </motion.div>
      <motion.div variants={itemVariants} className="mt-3 space-y-2.5 px-5">
        {inProgress.length === 0 && <p className="py-6 text-center text-sm text-muted">All caught up!</p>}
        {inProgress.map((t) => (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => openSheet({ kind: "task", id: t.id })}
            className="w-full rounded-[22px] bg-white p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{t.title}</p>
              <StatusPill status={t.status} />
            </div>
            <p className="mt-0.5 text-xs text-muted">{t.subject}</p>
            <ProgressBar value={t.progress} className="mt-3" />
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
