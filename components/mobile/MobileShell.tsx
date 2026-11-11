"use client";

import { CalendarDays, FileText, LayoutGrid, User, type LucideIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useDirection } from "@/lib/useDirection";
import { snappy, spring } from "@/lib/motion";
import { useStore, type MobileTab } from "@/lib/store";
import { HomeScreen } from "./HomeScreen";
import { ProfileScreen } from "./ProfileScreen";
import { ScheduleScreen } from "./ScheduleScreen";
import { TasksScreen } from "./TasksScreen";

const TABS: { id: MobileTab; icon: LucideIcon; label: string }[] = [
  { id: "home", icon: LayoutGrid, label: "Home" },
  { id: "schedule", icon: CalendarDays, label: "Schedule" },
  { id: "tasks", icon: FileText, label: "Tasks" },
  { id: "profile", icon: User, label: "Profile" },
];

const screenVariants = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0, filter: "blur(6px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (dir: number) => ({ x: dir * -48, opacity: 0, filter: "blur(6px)" }),
};

export function MobileShell() {
  const { tab, setTab, sheet } = useStore();
  const dir = useDirection(TABS.findIndex((t) => t.id === tab));

  return (
    <LayoutGroup id="mobile">
      <div className="fixed inset-0 bg-ink lg:hidden">
        {/* iOS-style: the page recedes when a sheet opens */}
        <motion.div
          animate={sheet ? { scale: 0.93, y: 8, borderRadius: 28 } : { scale: 1, y: 0, borderRadius: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          className="relative h-full overflow-hidden bg-canvas"
        >
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={tab}
              custom={dir}
              variants={screenVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ ...spring, opacity: { duration: 0.2 } }}
              className="no-scrollbar absolute inset-0 overflow-y-auto"
            >
              <div className="mx-auto max-w-2xl pb-32">
                {tab === "home" && <HomeScreen />}
                {tab === "schedule" && <ScheduleScreen />}
                {tab === "tasks" && <TasksScreen />}
                {tab === "profile" && <ProfileScreen />}
              </div>
            </motion.div>
          </AnimatePresence>

          <TabBar active={tab} onChange={setTab} />
        </motion.div>
      </div>
    </LayoutGroup>
  );
}

function TabBar({ active, onChange }: { active: MobileTab; onChange: (t: MobileTab) => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-[max(16px,env(safe-area-inset-bottom))]">
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.2 }}
        className="pointer-events-auto flex gap-1 rounded-full bg-ink/95 p-1.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.id === active;
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.85 }}
              transition={snappy}
              onClick={() => onChange(t.id)}
              aria-label={t.label}
              className="relative grid size-12 place-items-center rounded-full"
            >
              {on && (
                <motion.span layoutId="tab-active" transition={spring} className="absolute inset-0 rounded-full bg-white" />
              )}
              <Icon
                className={cn("relative z-10 size-5 transition-colors duration-300", on ? "text-ink" : "text-white/70")}
              />
            </motion.button>
          );
        })}
      </motion.nav>
    </div>
  );
}
