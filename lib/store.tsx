"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type PageId = "dashboard" | "tasks" | "settings" | "sections" | "teachers" | "students" | "activities" | "profile";

interface UIStore {
  page: PageId | null;
  setPage: (p: PageId) => void;
  /** Content shown in the global sheet (modal on desktop, bottom sheet on mobile). */
  sheet: ReactNode | null;
  openSheet: (content: ReactNode) => void;
  closeSheet: () => void;
  /** Increments when data changes somewhere (e.g. a submission), so pages refetch. */
  dataVersion: number;
  bumpData: () => void;
}

const Ctx = createContext<UIStore | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId | null>(null);
  const [sheet, setSheet] = useState<ReactNode | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const closeSheet = useCallback(() => setSheet(null), []);
  const bumpData = useCallback(() => setDataVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({ page, setPage, sheet, openSheet: setSheet, closeSheet, dataVersion, bumpData }),
    [page, sheet, closeSheet, dataVersion, bumpData],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useUI must be used inside UIProvider");
  return s;
}
