"use client";

import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DAYS, SCHEDULE, formatTime, lessonState } from "@/lib/data";
import { cn } from "@/lib/cn";
import { itemVariants, listVariants, snappy, spring } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { WeekStrip } from "../WeekStrip";
import { Avatar, Card, MenuItem, Popover } from "../ui";

export function ScheduleCard({
  className,
  delay,
  expanded,
}: {
  className?: string;
  delay?: number;
  expanded?: boolean;
}) {
  const { day, setDay } = useStore();
  const current = DAYS.find((d) => d.key === day)!;
  const lessons = SCHEDULE[day];

  return (
    <Card className={className} delay={delay}>
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-semibold">My schedule</h2>
        {!expanded && (
          <Popover
            className="w-44"
            trigger={({ open, toggle }) => (
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={snappy}
                onClick={toggle}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium ring-1 ring-line transition-colors hover:bg-soft"
              >
                {current.short}, Nov {current.date}
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring}>
                  <ChevronDown className="size-4 text-muted" />
                </motion.span>
              </motion.button>
            )}
          >
            {(close) =>
              DAYS.map((d) => (
                <MenuItem
                  key={d.key}
                  onClick={() => {
                    setDay(d.key);
                    close();
                  }}
                >
                  <span className="flex-1">
                    {d.long}, Nov {d.date}
                  </span>
                  {d.key === day && <Check className="size-4 text-lilac-deep" />}
                </MenuItem>
              ))
            }
          </Popover>
        )}
      </div>

      {expanded && <WeekStrip layoutId="d-week" className="mt-5" />}

      <div className="mt-4 grid grid-cols-[88px_1.1fr_1.4fr_1.2fr] gap-3 px-3 text-xs text-muted">
        <span>Time</span>
        <span>Lesson</span>
        <span>Teacher</span>
        <span>Location</span>
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
            {lessons.map((l) => {
              const state = lessonState(day, l);
              return (
                <motion.li
                  key={l.id}
                  variants={itemVariants}
                  whileHover={{ x: 3 }}
                  transition={snappy}
                  className={cn(
                    "relative mb-1 grid grid-cols-[88px_1.1fr_1.4fr_1.2fr] items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px]",
                    state === "now" ? "bg-mint" : "hover:bg-soft",
                    state === "past" && "text-muted",
                  )}
                >
                  <span className="tabular-nums">{formatTime(l.start)}</span>
                  <span className="truncate font-medium">{l.subject}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={l.teacher} size={26} />
                    <span className="truncate">{l.teacher}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 truncate">
                    {l.building}, {l.room}
                    {state === "now" && (
                      <span className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-mint-deep">
                        <motion.span
                          className="size-1.5 rounded-full bg-mint-deep"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1.6 }}
                        />
                        Now
                      </span>
                    )}
                  </span>
                </motion.li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      </div>
    </Card>
  );
}
