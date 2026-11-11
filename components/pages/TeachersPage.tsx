"use client";

import { AtSign, ChevronRight, Pencil, Presentation, Trash2 } from "lucide-react";
import { getProfiles, manageUsers } from "@/lib/api";
import { useUI } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { useQuery } from "@/lib/useQuery";
import { ConfirmSheet } from "../ConfirmSheet";
import { AccountForm } from "../forms/AccountForm";
import { AddButton, PageBody, PageHeader } from "../shell/PageHeader";
import { Avatar, Card, EmptyState, ErrorNote, IconButton, LoadingCards } from "../ui";

/** Admin: teacher accounts (teachers can also sign up themselves). */
export function TeachersPage({ embedded }: { embedded?: boolean } = {}) {
  const { openSheet } = useUI();
  const q = useQuery(() => Promise.all([getProfiles("teacher"), getProfiles("student")]));
  const [teachers, students] = q.data ?? [[], []];
  const studentCount = (id: string) => students.filter((s) => s.created_by === id).length;

  const openForm = (t?: Profile) =>
    openSheet(<AccountForm role="teacher" existing={t} onSaved={q.reload} onDelete={t ? () => remove(t) : undefined} />);

  const remove = (t: Profile) =>
    openSheet(
      <ConfirmSheet
        title={`Delete ${t.full_name}?`}
        text="Their login is removed, together with their sections, subjects, activities and the submissions on them. Their student accounts stay."
        onConfirm={async () => {
          await manageUsers({ action: "delete", id: t.id });
          q.reload();
        }}
      />,
    );

  return (
    <>
      <PageHeader
        compact={embedded}
        title="Teachers"
        subtitle={q.loading ? "Loading…" : `${teachers.length} teacher${teachers.length === 1 ? "" : "s"}`}
        action={<AddButton label="New teacher" onClick={() => openForm()} />}
      />
      <PageBody>
        <ErrorNote message={q.error} />
        {q.loading && !q.data ? (
          <LoadingCards />
        ) : teachers.length === 0 ? (
          <EmptyState
            icon={<Presentation className="size-7" />}
            title="No teachers yet"
            text="Teachers can sign up from the login screen, or you can create an account here."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {teachers.map((t, i) => (
              <Card key={t.id} delay={i * 0.04} onClick={() => openForm(t)}>
                <div className="flex items-center gap-3">
                  <Avatar name={t.full_name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.full_name}</p>
                    <p className="flex items-center gap-1 truncate text-sm text-muted">
                      <AtSign className="size-3.5" />
                      {t.username}
                    </p>
                  </div>
                  <div className="hidden gap-2 lg:flex" onClick={(e) => e.stopPropagation()}>
                    <IconButton variant="soft" size={36} onClick={() => openForm(t)} aria-label="Edit">
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton variant="danger" size={36} onClick={() => remove(t)} aria-label="Delete">
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted lg:hidden" />
                </div>
                <p className="mt-3 text-xs text-muted">
                  {studentCount(t.id)} student{studentCount(t.id) === 1 ? "" : "s"}
                </p>
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
