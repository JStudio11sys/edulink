"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getLessons,
  getNotes,
  getTasks,
  insertLesson,
  insertNote,
  insertTask,
  removeLesson,
  removeNote,
  removeTask,
  updateLesson,
  updateNote,
  updateTask,
} from "./api";
import type { Lesson, Note, PersonalTask } from "./types";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** A list kept in memory with instant (optimistic) edits, saved to Supabase in the background. */
function useCollection<T extends { id: string }, New>(
  enabled: boolean,
  load: () => Promise<T[]>,
  insert: (n: New) => Promise<T>,
  update: (id: string, p: Partial<T>) => Promise<unknown>,
  remove: (id: string) => Promise<unknown>,
  sort?: (a: T, b: T) => number,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const order = useCallback((xs: T[]) => (sort ? [...xs].sort(sort) : xs), [sort]);

  const reload = useCallback(async () => {
    try {
      setItems(order(await load()));
      setError(null);
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }, [load, order]);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const add = useCallback(
    async (n: New) => {
      const row = await insert(n);
      setItems((p) => order([row, ...p]));
      return row;
    },
    [insert, order],
  );

  const patch = useCallback(
    async (id: string, p: Partial<T>) => {
      setItems((xs) => order(xs.map((x) => (x.id === id ? { ...x, ...p } : x))));
      try {
        await update(id, p);
      } catch (e) {
        reload();
        throw e;
      }
    },
    [update, order, reload],
  );

  const del = useCallback(
    async (id: string) => {
      setItems((xs) => xs.filter((x) => x.id !== id));
      try {
        await remove(id);
      } catch (e) {
        reload();
        throw e;
      }
    },
    [remove, reload],
  );

  return { items, loading, error, add, patch, remove: del, reload };
}

const byNoteDate = (a: Note, b: Note) => b.updated_at.localeCompare(a.updated_at);
const byLessonTime = (a: Lesson, b: Lesson) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time);

function usePersonalData(enabled: boolean) {
  const tasks = useCollection<PersonalTask, Omit<PersonalTask, "id" | "owner_id" | "created_at">>(
    enabled,
    getTasks,
    insertTask,
    updateTask,
    removeTask,
  );
  const notes = useCollection<Note, Pick<Note, "title" | "body" | "color">>(
    enabled,
    getNotes,
    insertNote,
    updateNote,
    removeNote,
    byNoteDate,
  );
  const lessons = useCollection<Lesson, Omit<Lesson, "id" | "owner_id">>(
    enabled,
    getLessons,
    insertLesson,
    updateLesson,
    removeLesson,
    byLessonTime,
  );
  return useMemo(() => ({ tasks, notes, lessons }), [tasks, notes, lessons]);
}

type Personal = ReturnType<typeof usePersonalData>;
const Ctx = createContext<Personal | null>(null);

export function PersonalProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const value = usePersonalData(enabled);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePersonal() {
  const s = useContext(Ctx);
  if (!s) throw new Error("usePersonal must be used inside PersonalProvider");
  return s;
}
