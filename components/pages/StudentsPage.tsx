"use client";

import { ChevronRight, Pencil, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { getProfiles, getSectionStudents, getSections, manageUsers, setStudentSection } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useUI } from "@/lib/store";
import type { Profile, Section, SectionStudent } from "@/lib/types";
import { useQuery } from "@/lib/useQuery";
import { ConfirmSheet } from "../ConfirmSheet";
import { AccountForm } from "../forms/AccountForm";
import { AddButton, PageBody, PageHeader } from "../shell/PageHeader";
import { Avatar, Card, EmptyState, ErrorNote, IconButton, LoadingCards } from "../ui";
import { displayName, sortStudents } from "@/lib/names";

/** Teacher: own students (create/edit, pick their section). Admin: every student (edit/delete). */
export function StudentsPage({ embedded }: { embedded?: boolean } = {}) {
  const me = useMe();
  const isAdmin = me.role === "admin";
  const { openSheet } = useUI();
  const [search, setSearch] = useState("");

  const q = useQuery(() =>
    Promise.all([
      getProfiles("student"),
      getSections(),
      getSectionStudents(),
      isAdmin ? getProfiles("teacher") : Promise.resolve([] as Profile[]),
    ]),
  );
  const [students, sections, members, teachers] = (q.data ?? [[], [], [], []]) as [
    Profile[],
    Section[],
    SectionStudent[],
    Profile[],
  ];

  const sectionName = Object.fromEntries(sections.map((s) => [s.id, s.name]));
  const teacherName = Object.fromEntries(teachers.map((t) => [t.id, t.full_name]));
  const mySections = sections.filter((s) => s.teacher_id === me.id);
  const sectionOf = (id: string) => members.find((m) => m.student_id === id)?.section_id ?? null;

  const term = search.trim().toLowerCase();
  const ordered = sortStudents(students);
  const visible = ordered.filter(
    (s) => !term || displayName(s).toLowerCase().includes(term) || s.full_name.toLowerCase().includes(term) || s.username.includes(term),
  );

  const openForm = (s?: Profile) => {
    openSheet(
      isAdmin ? (
        <AccountForm role="student" existing={s} onSaved={q.reload} onDelete={s ? () => remove(s) : undefined} />
      ) : (
        <AccountForm
          role="student"
          existing={s}
          sections={mySections}
          currentSectionId={s ? sectionOf(s.id) : null}
          saveSection={setStudentSection}
          onSaved={q.reload}
          onDelete={s ? () => remove(s) : undefined}
        />
      ),
    );
  };

  const remove = (s: Profile) =>
    openSheet(
      <ConfirmSheet
        title={`Delete ${s.full_name}?`}
        text="Their login and all their submissions will be permanently removed."
        onConfirm={async () => {
          await manageUsers({ action: "delete", id: s.id });
          q.reload();
        }}
      />,
    );

  return (
    <>
      <PageHeader
        compact={embedded}
        title={isAdmin ? "Students" : "My students"}
        subtitle={q.loading ? "Loading…" : `${students.length} student${students.length === 1 ? "" : "s"}`}
        action={!isAdmin && <AddButton label="New student" onClick={() => openForm()} />}
      />
      <PageBody>
        {students.length > 0 && (
          <div className="mb-4 flex h-11 items-center gap-2 rounded-2xl bg-white px-3.5 ring-1 ring-line lg:max-w-sm">
            <Search className="size-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            />
          </div>
        )}
        <ErrorNote message={q.error} />

        {q.loading && !q.data ? (
          <LoadingCards />
        ) : students.length === 0 ? (
          <EmptyState
            icon={<Users className="size-7" />}
            title="No students yet"
            text={
              isAdmin
                ? "Teachers create their own students."
                : "Create a profile for each student. You'll get a username and password to give them."
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((s, i) => (
              <Card key={s.id} delay={Math.min(i, 8) * 0.03} onClick={() => openForm(s)}>
                <div className="flex items-center gap-3">
                  <Avatar name={s.full_name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{displayName(s)}</p>
                    <p className="truncate text-sm text-muted">@{s.username}</p>
                  </div>
                  {/* Desktop: quick buttons. Mobile: tap the card (delete is inside the form). */}
                  <div className="hidden gap-2 lg:flex" onClick={(e) => e.stopPropagation()}>
                    <IconButton variant="soft" size={36} onClick={() => openForm(s)} aria-label="Edit">
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton variant="danger" size={36} onClick={() => remove(s)} aria-label="Delete">
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted lg:hidden" />
                </div>
                {isAdmin && (
                  <p className="mt-3 text-xs text-muted">
                    Teacher: {s.created_by ? (teacherName[s.created_by] ?? "—") : "—"}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted">
                  {sectionOf(s.id) ? (
                    <span className="rounded-full bg-lilac-soft px-2.5 py-0.5 font-medium text-lilac-deep">
                      {sectionName[sectionOf(s.id)!] ?? "Section"}
                    </span>
                  ) : (
                    "No section yet"
                  )}
                </p>
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
