"use client";

import { ArrowUpDown, Check, ClipboardList, Search, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { useStudentData, type StudentStatus } from "@/lib/useStudent";
import { PageBody, PageHeader } from "../shell/PageHeader";
import { EmptyState, ErrorNote, IconButton, LoadingCards, MenuItem, Popover, Segmented, ToggleChip } from "../ui";
import { ActivityRow } from "./shared";

type Filter = "all" | StudentStatus;
type Sort = "due" | "title" | "subject";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "overdue", label: "Overdue" },
  { value: "submitted", label: "Submitted" },
];

export function StudentActivities() {
  const { items, mySubjects, loading, error, data } = useStudentData();
  const [filter, setFilter] = useState<Filter>("all");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<Sort>("due");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const list = items
    .filter((i) => filter === "all" || i.status === filter)
    .filter((i) => !subjects.length || subjects.includes(i.activity.subject_id))
    .filter((i) => !q || i.activity.title.toLowerCase().includes(q))
    .sort((a, b) =>
      sort === "title"
        ? a.activity.title.localeCompare(b.activity.title)
        : sort === "subject"
          ? a.subject.localeCompare(b.subject)
          : 0,
    );
  const pending = items.filter((i) => i.status !== "submitted").length;

  return (
    <>
      <PageHeader
        title="My activities"
        subtitle={loading && !data ? "Loading…" : pending ? `${pending} to do` : "All caught up"}
        action={
          <IconButton aria-label="Search" onClick={() => setSearchOpen((s) => !s)}>
            <motion.span key={String(searchOpen)} initial={{ rotate: -90, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }}>
              {searchOpen ? <X className="size-[18px]" /> : <Search className="size-[18px]" />}
            </motion.span>
          </IconButton>
        }
      />
      <PageBody>
        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring}
              className="overflow-hidden"
            >
              <div className="mb-3 flex h-11 items-center gap-2 rounded-2xl bg-white px-3.5 ring-1 ring-line lg:max-w-sm">
                <Search className="size-4 text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search activities"
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Segmented layoutId="s-status-filter" size="md" options={FILTERS} value={filter} onChange={setFilter} />

        <div className="mt-4 flex items-center justify-between text-[13px]">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters((s) => !s)}
            className={cn("flex items-center gap-1.5 rounded-full px-2 py-1", showFilters && "bg-white")}
          >
            <SlidersHorizontal className="size-4" /> Subjects
            {subjects.length > 0 && (
              <span className="grid size-4 place-items-center rounded-full bg-lilac text-[10px] text-white">
                {subjects.length}
              </span>
            )}
          </motion.button>
          <Popover
            className="w-44"
            trigger={({ toggle }) => (
              <motion.button whileTap={{ scale: 0.95 }} onClick={toggle} className="flex items-center gap-1.5 px-2 py-1">
                <ArrowUpDown className="size-4" /> Sort by
              </motion.button>
            )}
          >
            {(close) =>
              (
                [
                  ["due", "Due date"],
                  ["subject", "Subject"],
                  ["title", "Title"],
                ] as [Sort, string][]
              ).map(([v, l]) => (
                <MenuItem
                  key={v}
                  onClick={() => {
                    setSort(v);
                    close();
                  }}
                >
                  <span className="flex-1">{l}</span>
                  {sort === v && <Check className="size-4 text-lilac-deep" />}
                </MenuItem>
              ))
            }
          </Popover>
        </div>

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 pt-3">
                {mySubjects.map((s) => {
                  const on = subjects.includes(s.id);
                  return (
                    <ToggleChip
                      key={s.id}
                      on={on}
                      onClick={() => setSubjects((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                    >
                      {s.name}
                    </ToggleChip>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4">
          <ErrorNote message={error} />
          {loading && !data ? (
            <LoadingCards />
          ) : mySubjects.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-7" />}
              title="No subjects yet"
              text="Your teacher hasn't enrolled you in a subject yet."
            />
          ) : list.length === 0 ? (
            <EmptyState icon={<ClipboardList className="size-7" />} title="Nothing here" text="No activities match." />
          ) : (
            <motion.div layout className="grid gap-2.5 lg:grid-cols-2">
              <AnimatePresence initial={false} mode="popLayout">
                {list.map((i, idx) => (
                  <ActivityRow key={i.activity.id} item={i} index={idx} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </PageBody>
    </>
  );
}
