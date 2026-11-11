"use client";

import { CheckCircle2, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useAuth, useMe } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { itemVariants, listVariants, spring } from "@/lib/motion";
import { useStudentData } from "@/lib/useStudent";
import { PrimaryButton, Segmented } from "../ui";
import { ActivityRow, SubjectIcon, Tile, useOpenActivity } from "./shared";
import { Credit } from "../Credit";

/** Profile in the sample's style: lilac header, avatar tile, tab tiles, upcoming list. */
export function StudentProfile() {
  const me = useMe();
  const { signOut } = useAuth();
  const open = useOpenActivity();
  const { items, mySubjects } = useStudentData();
  const [tab, setTab] = useState<"subjects" | "submitted">("subjects");
  const submitted = items.filter((i) => i.status === "submitted");
  const upcoming = items.filter((i) => i.status !== "submitted").slice(0, 3);
  const initials = me.full_name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative pb-32 lg:overflow-hidden lg:rounded-card lg:pb-0">
      <div className="absolute inset-x-0 top-0 h-64 bg-lilac" />

      <div className="relative px-5 pt-[max(20px,env(safe-area-inset-top))] pb-6 lg:px-8 lg:pt-7">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="text-[26px] font-semibold tracking-tight text-white"
        >
          My profile
        </motion.h1>
      </div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={spring}
        className="relative min-h-[70dvh] rounded-t-[34px] bg-canvas px-5 pt-5 lg:min-h-0 lg:rounded-[34px] lg:p-8"
      >
        <motion.div variants={listVariants} initial="hidden" animate="show" className="lg:max-w-3xl">
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <motion.div
              whileTap={{ scale: 0.94, rotate: -3 }}
              className="grid size-[96px] shrink-0 place-items-center rounded-[28px] bg-gradient-to-br from-peach via-lilac-soft to-lilac text-3xl font-semibold text-lilac-deep"
            >
              {initials}
            </motion.div>
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold">{me.full_name}</p>
              <p className="text-sm text-muted">@{me.username}</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Segmented
              className="mt-5 rounded-full bg-white p-1"
              layoutId="s-profile-tab"
              grow
              options={[
                { value: "subjects", label: "Subjects" },
                { value: "submitted", label: "Submitted" },
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
              {tab === "subjects" ? (
                mySubjects.length === 0 ? (
                  <p className="rounded-[22px] bg-white p-5 text-center text-sm text-muted">Not enrolled in any subject yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                    {mySubjects.map((s, i) => (
                      <Tile
                        key={s.id}
                        index={i}
                        icon={<SubjectIcon name={s.name} size="sm" />}
                        title={s.name}
                        caption={s.teacher ?? "—"}
                      />
                    ))}
                  </div>
                )
              ) : submitted.length === 0 ? (
                <p className="rounded-[22px] bg-white p-5 text-center text-sm text-muted">Nothing submitted yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                  {submitted.map((i, idx) => (
                    <Tile
                      key={i.activity.id}
                      index={idx}
                      icon={
                        <span
                          className={`grid size-9 place-items-center rounded-xl ${i.late ? "bg-red-100 text-red-500" : "bg-mint"}`}
                        >
                          <CheckCircle2 className="size-[18px]" />
                        </span>
                      }
                      title={i.activity.title}
                      caption={`${i.late ? "Late" : "On time"}${i.submission ? ` · ${fmtDate(i.submission.submitted_at)}` : ""}`}
                      onClick={() => open(i)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <motion.h2 variants={itemVariants} className="mt-6 mb-3 text-lg font-semibold">
            Upcoming activities
          </motion.h2>
          <div className="space-y-2.5">
            {upcoming.length === 0 ? (
              <p className="rounded-[22px] bg-white p-5 text-center text-sm text-muted">All caught up!</p>
            ) : (
              upcoming.map((i, idx) => <ActivityRow key={i.activity.id} item={i} index={idx} />)
            )}
          </div>

          <motion.div variants={itemVariants} className="mt-8">
            <PrimaryButton variant="soft" className="w-full bg-white text-red-500 lg:max-w-xs" onClick={signOut}>
              <LogOut className="size-4" /> Log out
            </PrimaryButton>
            <div className="mt-3 lg:text-left">
              <Credit />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
