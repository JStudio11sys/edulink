"use client";

import { Award, BookOpen, Check, FlaskConical, MoreVertical, Palette, Pencil, Ruler, Star, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ACHIEVEMENTS, ACTIVITIES, STUDENT } from "@/lib/data";
import { cn } from "@/lib/cn";
import { itemVariants, listVariants, snappy, spring } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { Notifications } from "../Notifications";
import { NoteCard } from "../NoteCard";
import { IconButton, NOTE_BG, Segmented } from "../ui";

const ACTIVITY_ICON = { a1: Ruler, a2: Palette, a3: FlaskConical } as const;
const BADGE_ICON = [Trophy, BookOpen, Award, Star];

export function ProfileScreen() {
  const { notes } = useStore();
  const [tab, setTab] = useState<"achievements" | "notes">("achievements");
  const [editing, setEditing] = useState(false);
  const [about, setAbout] = useState(
    "I am interested in math and biology. I like to solve complex problems and participate in school Olympiads.",
  );

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-64 bg-lilac" />

      <div className="relative flex items-center justify-between px-5 pt-[max(20px,env(safe-area-inset-top))] pb-6">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="text-[26px] font-semibold tracking-tight text-white"
        >
          My profile
        </motion.h1>
        <div className="flex gap-2">
          <IconButton aria-label="Edit about" onClick={() => setEditing((e) => !e)} className="ring-0">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={String(editing)}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={snappy}
              >
                {editing ? <Check className="size-[18px]" /> : <Pencil className="size-[18px]" />}
              </motion.span>
            </AnimatePresence>
          </IconButton>
          <Notifications />
        </div>
      </div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={spring}
        className="relative min-h-[70dvh] rounded-t-[34px] bg-canvas px-5 pt-5"
      >
        <motion.div variants={listVariants} initial="hidden" animate="show">
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <motion.div
              whileTap={{ scale: 0.94, rotate: -3 }}
              className="grid size-[96px] place-items-center rounded-[28px] bg-gradient-to-br from-peach via-lilac-soft to-lilac text-3xl font-semibold text-lilac-deep"
            >
              KM
            </motion.div>
            <div>
              <p className="text-2xl font-semibold">{STUDENT.name}</p>
              <p className="text-sm text-muted">{STUDENT.className}</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Segmented
              className="mt-5 rounded-full bg-white p-1"
              layoutId="m-profile-tab"
              grow
              options={[
                { value: "achievements", label: "Achievements" },
                { value: "notes", label: "Notes" },
              ]}
              value={tab}
              onChange={setTab}
            />
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              {tab === "achievements" ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {ACHIEVEMENTS.map((a, i) => {
                    const Icon = BADGE_ICON[i];
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...spring, delay: i * 0.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-[22px] bg-white p-3.5"
                      >
                        <div className={cn("grid size-9 place-items-center rounded-xl", NOTE_BG[a.color])}>
                          <Icon className="size-[18px]" />
                        </div>
                        <p className="mt-2.5 text-sm font-semibold">{a.title}</p>
                        <p className="text-xs text-muted">{a.desc}</p>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5">
                  {notes.map((n) => (
                    <NoteCard key={n.id} note={n} className="h-[170px] w-[160px]" />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <motion.div variants={itemVariants}>
            <h2 className="mt-6 text-lg font-semibold">About</h2>
            <AnimatePresence mode="wait" initial={false}>
              {editing ? (
                <motion.textarea
                  key="edit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  autoFocus
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl bg-white p-3 text-[15px] leading-relaxed outline-none ring-2 ring-lilac"
                />
              ) : (
                <motion.p
                  key="read"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 text-[15px] leading-relaxed text-ink-2"
                >
                  {about}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h2 className="mt-6 text-lg font-semibold">Upcoming activities</h2>
            <div className="mt-3 space-y-2.5">
              {ACTIVITIES.map((a) => {
                const Icon = ACTIVITY_ICON[a.id as keyof typeof ACTIVITY_ICON];
                return (
                  <motion.div
                    key={a.id}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 rounded-[22px] bg-white p-3.5"
                  >
                    <div className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", NOTE_BG[a.color])}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate font-semibold">{a.title}</p>
                        <span className="shrink-0 text-[11px] text-muted">{a.date}</span>
                      </div>
                      <p className="text-[13px] text-muted">{a.desc}</p>
                    </div>
                    <MoreVertical className="size-5 text-muted" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
