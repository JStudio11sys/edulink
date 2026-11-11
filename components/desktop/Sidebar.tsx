"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Settings,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { snappy, spring } from "@/lib/motion";
import { useStore, type DesktopView } from "@/lib/store";
import { Logo } from "../Logo";

type Item = { id: DesktopView; label: string; icon: LucideIcon; badge?: number };

export function Sidebar() {
  const { view, setView, tasks, notes } = useStore();
  const open = tasks.filter((t) => t.status !== "done").length;

  const main: Item[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "schedule", label: "Schedule", icon: CalendarDays },
    { id: "tasks", label: "Tasks", icon: FileText, badge: open },
    { id: "tests", label: "Tests", icon: ClipboardCheck },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];
  const secondary: Item[] = [
    { id: "chat", label: "Chat", icon: MessageCircle, badge: 2 },
    { id: "notes", label: "Notes", icon: StickyNote, badge: notes.length },
  ];

  const render = (it: Item) => (
    <NavItem key={it.id} item={it} active={view === it.id} onClick={() => setView(it.id)} />
  );

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={spring}
      className="isolate flex w-[76px] shrink-0 flex-col rounded-card bg-white p-3 xl:w-[232px] xl:p-4"
    >
      <div className="mb-6 flex items-center gap-3 px-1.5 pt-1">
        <motion.div whileHover={{ rotate: -8, scale: 1.06 }} transition={snappy} className="shrink-0">
          <Logo size={40} />
        </motion.div>
        <span className="hidden text-lg font-semibold xl:inline">EduLink</span>
      </div>

      <nav className="space-y-1">{main.map(render)}</nav>
      <div className="mx-3 my-4 h-px bg-line" />
      <nav className="space-y-1">{secondary.map(render)}</nav>

      <div className="mt-auto space-y-1">
        <NavItem
          item={{ id: "settings", label: "Settings", icon: Settings }}
          active={view === "settings"}
          onClick={() => setView("settings")}
        />
        <NavItem item={{ id: "dashboard", label: "Log out", icon: LogOut }} active={false} onClick={() => {}} />
      </div>
    </motion.aside>
  );
}

function NavItem({ item, active, onClick }: { item: Item; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={snappy}
      title={item.label}
      className={cn(
        "group relative flex w-full items-center justify-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 xl:justify-start",
        active ? "text-white" : "text-ink-2",
      )}
    >
      {active ? (
        <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-2xl bg-ink" transition={spring} />
      ) : (
        <span className="absolute inset-0 rounded-2xl bg-soft opacity-0 transition-opacity group-hover:opacity-100" />
      )}
      <Icon className="relative z-10 size-[18px] shrink-0" />
      <span className="relative z-10 hidden xl:inline">{item.label}</span>
      <AnimatePresence mode="popLayout">
        {!!item.badge && (
          <motion.span
            key={item.badge}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={snappy}
            className={cn(
              "z-10 grid size-5 place-items-center rounded-full text-[11px] font-semibold",
              "absolute top-1 right-2 xl:static xl:ml-auto",
              active ? "bg-white text-ink" : "bg-lilac text-white",
            )}
          >
            {item.badge}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
