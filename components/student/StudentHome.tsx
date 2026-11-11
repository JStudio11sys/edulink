"use client";

import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMe } from "@/lib/auth";
import { itemVariants, listVariants, spring } from "@/lib/motion";
import { useUI } from "@/lib/store";
import { useStudentData } from "@/lib/useStudent";
import { Avatar, ErrorNote, LoadingCards } from "../ui";
import { ActivityRow, SubjectIcon, Tile } from "./shared";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning," : h < 18 ? "Good afternoon," : "Good evening,";
};

function StatTile({ icon, tone, value, label, onClick, index }: { icon: ReactNode; tone: string; value: number; label: string; onClick: () => void; index: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...spring, delay: index * 0.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="rounded-[22px] bg-white p-3.5 text-left"
    >
      <span className={`grid size-9 place-items-center rounded-xl ${tone}`}>{icon}</span>
      <p className="mt-2.5 text-2xl leading-none font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </motion.button>
  );
}

export function StudentHome() {
  const me = useMe();
  const { setPage } = useUI();
  const { items, mySubjects, loading, error, data } = useStudentData();

  const todo = items.filter((i) => i.status === "todo").length;
  const overdue = items.filter((i) => i.status === "overdue").length;
  const done = items.filter((i) => i.status === "submitted").length;
  const upcoming = items.filter((i) => i.status !== "submitted").slice(0, 5);
  const goActivities = () => setPage("activities");

  return (
    <motion.div variants={listVariants} initial="hidden" animate="show" className="pb-32 lg:pb-4">
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))] pb-5 lg:mb-4 lg:rounded-card lg:bg-white lg:px-6 lg:py-5"
      >
        <Avatar name={me.full_name} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{greeting()}</p>
          <p className="truncate text-xl font-semibold lg:text-2xl">{me.full_name.split(" ")[0]}</p>
        </div>
      </motion.div>

      <div className="px-5 lg:px-0">
        <ErrorNote message={error} />
        {loading && !data ? (
          <LoadingCards />
        ) : (
          <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            <div>
              <div className="grid grid-cols-3 gap-2.5">
                <StatTile index={0} icon={<ClipboardList className="size-[18px]" />} tone="bg-lilac" value={todo} label="To do" onClick={goActivities} />
                <StatTile index={1} icon={<AlertCircle className="size-[18px]" />} tone="bg-red-100 text-red-500" value={overdue} label="Overdue" onClick={goActivities} />
                <StatTile index={2} icon={<CheckCircle2 className="size-[18px]" />} tone="bg-mint" value={done} label="Submitted" onClick={goActivities} />
              </div>

              <motion.h2 variants={itemVariants} className="mt-7 mb-3 text-lg font-semibold">
                My subjects
              </motion.h2>
              {mySubjects.length === 0 ? (
                <p className="rounded-[22px] bg-white p-5 text-sm text-muted">
                  Your teacher hasn&apos;t enrolled you in a subject yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {mySubjects.map((s, i) => (
                    <Tile
                      key={s.id}
                      index={i}
                      icon={<SubjectIcon name={s.name} size="sm" />}
                      title={s.name}
                      caption={s.pending ? `${s.pending} to do` : s.teacher ?? "All done"}
                      onClick={goActivities}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <motion.div variants={itemVariants} className="mt-7 mb-3 flex items-center justify-between lg:mt-0">
                <h2 className="text-lg font-semibold">Upcoming activities</h2>
                <button onClick={goActivities} className="text-sm font-medium text-lilac-deep">
                  See all
                </button>
              </motion.div>
              <div className="space-y-2.5">
                {upcoming.length === 0 ? (
                  <p className="rounded-[22px] bg-white p-5 text-center text-sm text-muted">All caught up. Nice work!</p>
                ) : (
                  upcoming.map((i, idx) => <ActivityRow key={i.activity.id} item={i} index={idx} />)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
