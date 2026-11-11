"use client";

import { CalendarDays, Clock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";
import { useDirection } from "@/lib/useDirection";
import { DAYS, SCHEDULE, TODAY, formatTime, lessonState } from "@/lib/data";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { WeekStrip } from "../WeekStrip";
import { Avatar, IconButton } from "../ui";
import { ScreenHeader } from "./ScreenHeader";

export function ScheduleScreen() {
  const { day, setDay } = useStore();
  const idx = DAYS.findIndex((d) => d.key === day);
  const dir = useDirection(idx);

  const lessons = SCHEDULE[day];
  const nowIdx = lessons.findIndex((l) => lessonState(day, l) === "now");

  const go = (delta: number) => {
    const next = DAYS[idx + delta];
    if (next) setDay(next.key);
  };

  return (
    <div>
      <ScreenHeader title="My schedule">
        <IconButton aria-label="Today" onClick={() => setDay(TODAY)} className="rounded-2xl">
          <CalendarDays className="size-[18px]" />
        </IconButton>
      </ScreenHeader>

      <WeekStrip layoutId="m-week" className="px-5" />

      <p className="mt-3 px-5 text-center text-[11px] text-muted">Swipe left or right to change day</p>

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
              if (info.offset.x < -60 || info.velocity.x < -400) go(1);
              else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
            }}
            className="space-y-3 px-5 pb-4"
          >
            {lessons.map((l, i) => {
              const state = lessonState(day, l);
              return (
                <Fragment key={l.id}>
                  {i === nowIdx && (
                    <div className="flex items-center gap-2 py-1 text-xs text-muted">
                      Now <span className="h-px flex-1 bg-ink/15" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: i * 0.04 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex gap-4 rounded-[26px] p-4",
                      state === "now" ? "bg-mint" : "bg-white",
                      state === "past" && "opacity-60",
                    )}
                  >
                    <div className="flex w-[74px] shrink-0 flex-col">
                      <Clock className="size-5" />
                      <span className="mt-3 text-[13px] tabular-nums">{formatTime(l.start)}</span>
                      <span className="my-1 ml-2 h-4 w-px border-l border-dashed border-ink/30" />
                      <span className="text-[13px] tabular-nums">{formatTime(l.end)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-semibold">{l.subject}</p>
                      <p className="mt-0.5 text-sm text-ink/60">
                        {l.building}, {l.room}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-sm">
                        <Avatar name={l.teacher} size={28} />
                        {l.teacher}
                      </div>
                    </div>
                  </motion.div>
                </Fragment>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
