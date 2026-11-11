"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { initialNotes, initialTasks, TODAY, type Note, type Status, type Task } from "./data";

export type SheetState =
  | { kind: "task"; id: string }
  | { kind: "newTask" }
  | { kind: "note"; id: string }
  | { kind: "newNote" }
  | null;

export type DesktopView =
  | "dashboard"
  | "schedule"
  | "tasks"
  | "tests"
  | "reports"
  | "chat"
  | "notes"
  | "settings";

export type MobileTab = "home" | "schedule" | "tasks" | "profile";

interface Store {
  tasks: Task[];
  notes: Note[];
  addTask: (t: Omit<Task, "id">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  setStatus: (id: string, s: Status) => void;
  deleteTask: (id: string) => void;
  addNote: (n: Omit<Note, "id">) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  sheet: SheetState;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
  day: string;
  setDay: (d: string) => void;
  view: DesktopView;
  setView: (v: DesktopView) => void;
  tab: MobileTab;
  setTab: (t: MobileTab) => void;
  unread: boolean;
  markRead: () => void;
}

const Ctx = createContext<Store | null>(null);
const uid = () => Math.random().toString(36).slice(2, 9);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [notes, setNotes] = useState(initialNotes);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [day, setDay] = useState(TODAY);
  const [view, setView] = useState<DesktopView>("dashboard");
  const [tab, setTab] = useState<MobileTab>("home");
  const [unread, setUnread] = useState(true);

  const addTask = useCallback((t: Omit<Task, "id">) => setTasks((p) => [{ ...t, id: uid() }, ...p]), []);
  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [],
  );
  const setStatus = useCallback(
    (id: string, s: Status) =>
      setTasks((p) =>
        p.map((t) =>
          t.id === id
            ? { ...t, status: s, progress: s === "done" ? 100 : s === "todo" ? 0 : Math.min(Math.max(t.progress, 10), 90) }
            : t,
        ),
      ),
    [],
  );
  const deleteTask = useCallback((id: string) => setTasks((p) => p.filter((t) => t.id !== id)), []);
  const addNote = useCallback((n: Omit<Note, "id">) => setNotes((p) => [{ ...n, id: uid() }, ...p]), []);
  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    [],
  );
  const deleteNote = useCallback((id: string) => setNotes((p) => p.filter((n) => n.id !== id)), []);

  const value = useMemo<Store>(
    () => ({
      tasks,
      notes,
      addTask,
      updateTask,
      setStatus,
      deleteTask,
      addNote,
      updateNote,
      deleteNote,
      sheet,
      openSheet: setSheet,
      closeSheet: () => setSheet(null),
      day,
      setDay,
      view,
      setView,
      tab,
      setTab,
      unread,
      markRead: () => setUnread(false),
    }),
    [tasks, notes, sheet, day, view, tab, unread, addTask, updateTask, setStatus, deleteTask, addNote, updateNote, deleteNote],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
