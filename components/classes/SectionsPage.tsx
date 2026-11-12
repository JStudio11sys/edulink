"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import {
  addClass,
  addSection,
  addSubject,
  deleteSection,
  deleteSubject,
  removeClass,
  renameSection,
  renameSubject,
  setStudentSection,
} from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import { snappy, spring } from "@/lib/motion";
import { useUI } from "@/lib/store";
import { CATEGORIES, type ClassRow, type Section } from "@/lib/types";
import { useTeacherData, type StudentWork, type TeacherData } from "@/lib/useTeacherData";
import { ActionSheet, ConfirmSheet } from "../ConfirmSheet";
import { WORK_PROGRESS } from "@/lib/useTeacherData";
import { WorkLabels, WorkSheet } from "../dashboard/StudentWork";
import { AccountForm } from "../forms/AccountForm";
import { ActivityForm } from "../forms/ActivityForm";
import { SheetHeader } from "../Sheet";
import { PageBody, PageHeader } from "../shell/PageHeader";
import { SubjectIcon } from "../student/shared";
import {
  Avatar,
  Card,
  EmptyState,
  ErrorNote,
  IconButton,
  LoadingCards,
  MenuItem,
  Popover,
  PrimaryButton,
  ProgressBar,
  Segmented,
  inputCls,
} from "../ui";
import { ActivitySheet, ModeBadge } from "./ActivitySheet";
import { displayName, groupBySex } from "@/lib/names";

type View =
  | { kind: "home" }
  | { kind: "section"; sectionId: string }
  | { kind: "class"; classId: string }
  | { kind: "student"; classId: string; studentId: string };

const depth = (v: View) => ({ home: 0, section: 1, class: 2, student: 3 })[v.kind];
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Teacher: Sections → Section → Subject (class) → Student → activities by category. */
export function SectionsPage() {
  const data = useTeacherData();
  const [view, setView] = useState<View>({ kind: "home" });
  const [dir, setDir] = useState(1);
  const go = (v: View) => {
    setDir(depth(v) >= depth(view) ? 1 : -1);
    setView(v);
  };

  const content = (() => {
    if (view.kind === "section") return <SectionView data={data} sectionId={view.sectionId} go={go} />;
    if (view.kind === "class") return <ClassView data={data} classId={view.classId} go={go} />;
    if (view.kind === "student")
      return <StudentView data={data} classId={view.classId} studentId={view.studentId} go={go} />;
    return <HomeView data={data} go={go} />;
  })();

  return (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div
        key={JSON.stringify(view)}
        custom={dir}
        variants={{
          enter: (d: number) => ({ x: d * 40, opacity: 0 }),
          center: { x: 0, opacity: 1 },
          exit: (d: number) => ({ x: d * -40, opacity: 0 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ ...spring, opacity: { duration: 0.18 } }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

/* ====================== Shared bits ====================== */

function BackHeader({ back, onBack, title, subtitle, action }: { back: string; onBack: () => void; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="px-5 pt-[max(20px,env(safe-area-inset-top))] pb-4 lg:mb-4 lg:rounded-card lg:bg-white lg:px-6 lg:py-4">
      <button onClick={onBack} className="mb-2 flex items-center gap-1.5 text-sm font-medium text-lilac-deep">
        <ArrowLeft className="size-4" /> {back}
      </button>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-semibold tracking-tight lg:text-2xl">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

/** Small "type a name + Add" row. */
function InlineAdd({ placeholder, onAdd, autoFocus }: { placeholder: string; onAdd: (name: string) => Promise<unknown>; autoFocus?: boolean }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          setError(null);
          try {
            await onAdd(name.trim());
            setName("");
          } catch (err) {
            const m = msg(err);
            setError(/duplicate/i.test(m) ? "That name already exists." : m);
          } finally {
            setBusy(false);
          }
        }}
      >
        <input autoFocus={autoFocus} value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} className={inputCls} />
        <PrimaryButton type="submit" disabled={!name.trim()} loading={busy} className="shrink-0">
          <Plus className="size-4" /> Add
        </PrimaryButton>
      </form>
      {error && (
        <div className="mt-2">
          <ErrorNote message={error} />
        </div>
      )}
    </div>
  );
}

/** Rename sheet for a section or subject. */
function RenameSheet({ title, value, onSave }: { title: string; value: string; onSave: (v: string) => Promise<unknown> }) {
  const { closeSheet } = useUI();
  const [name, setName] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4 pt-1"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
          await onSave(name.trim());
          closeSheet();
        } catch (err) {
          setError(msg(err));
          setBusy(false);
        }
      }}
    >
      <SheetHeader title={title} />
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      <ErrorNote message={error} />
      <PrimaryButton type="submit" className="w-full" disabled={!name.trim()} loading={busy}>
        Save
      </PrimaryButton>
    </form>
  );
}

/* ====================== Level 0: all sections / subjects ====================== */

function HomeView({ data, go }: { data: TeacherData; go: (v: View) => void }) {
  const { openSheet, bumpData } = useUI();
  const [tab, setTab] = useState<"sections" | "subjects">("sections");
  const { sections, subjects, classes, studentsIn, loading, error } = data;
  const loadingFirst = loading && !data.data;

  return (
    <>
      <PageHeader title="Sections" subtitle="Your sections, subjects and students" />
      <PageBody>
        <Segmented
          className="mb-4"
          layoutId="sections-home-tab"
          size="md"
          options={[
            { value: "sections", label: `Sections${sections.length ? ` · ${sections.length}` : ""}` },
            { value: "subjects", label: `Subjects${subjects.length ? ` · ${subjects.length}` : ""}` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <ErrorNote message={error} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {tab === "sections" ? (
              <>
                <Card className="mb-4" guide="section-add">
                  <InlineAdd placeholder="New section, e.g. Grade 7 – Rizal" onAdd={async (n) => { await addSection(n); bumpData(); }} />
                </Card>
                {loadingFirst ? (
                  <LoadingCards />
                ) : sections.length === 0 ? (
                  <EmptyState icon={<LayoutGrid className="size-7" />} title="No sections yet" text="Add your first section above, then add subjects and students to it." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {sections.map((s, i) => {
                      const subs = classes.filter((c) => c.section_id === s.id);
                      return (
                        <Card key={s.id} guide="section-card" delay={Math.min(i, 8) * 0.03} onClick={() => go({ kind: "section", sectionId: s.id })}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="grid size-11 place-items-center rounded-2xl bg-lilac text-white">
                              <Users className="size-5" />
                            </span>
                            <ChevronRight className="size-4 text-muted" />
                          </div>
                          <p className="mt-3 text-[17px] font-semibold">{s.name}</p>
                          <p className="text-sm text-muted">
                            {studentsIn(s.id).length} student{studentsIn(s.id).length === 1 ? "" : "s"} · {subs.length} subject{subs.length === 1 ? "" : "s"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {subs.map((c) => (
                              <span key={c.id} className="rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-medium text-ink-2">
                                {subjects.find((x) => x.id === c.subject_id)?.name}
                              </span>
                            ))}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <Card className="mb-4">
                  <InlineAdd placeholder="New subject, e.g. English" onAdd={async (n) => { await addSubject(n); bumpData(); }} />
                </Card>
                {loadingFirst ? (
                  <LoadingCards count={2} />
                ) : subjects.length === 0 ? (
                  <EmptyState icon={<BookOpen className="size-7" />} title="No subjects yet" text="Add the subjects you teach. Then add them to your sections." />
                ) : (
                  <Card className="p-2">
                    <ul>
                      {subjects.map((s) => {
                        const n = classes.filter((c) => c.subject_id === s.id).length;
                        return (
                          <li key={s.id} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-soft">
                            <SubjectIcon name={s.name} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{s.name}</p>
                              <p className="text-xs text-muted">{n} section{n === 1 ? "" : "s"}</p>
                            </div>
                            <MoreActions
                              title={s.name}
                              items={[
                                {
                                  label: "Rename subject",
                                  icon: <Pencil className="size-5" />,
                                  onClick: () =>
                                    openSheet(<RenameSheet title="Rename subject" value={s.name} onSave={async (v) => { await renameSubject(s.id, v); bumpData(); }} />),
                                },
                                {
                                  label: "Delete subject",
                                  icon: <Trash2 className="size-5" />,
                                  danger: true,
                                  onClick: () =>
                                    openSheet(
                                      <ConfirmSheet
                                        title={`Delete ${s.name}?`}
                                        text="It's removed from every section, together with all its activities and submissions."
                                        onConfirm={async () => { await deleteSubject(s.id); bumpData(); }}
                                      />,
                                    ),
                                },
                              ]}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </PageBody>
    </>
  );
}

/* ====================== Level 1: one section ====================== */

function SectionView({ data, sectionId, go }: { data: TeacherData; sectionId: string; go: (v: View) => void }) {
  const { openSheet, bumpData } = useUI();
  const section = data.sections.find((s) => s.id === sectionId);
  if (!section) return <Missing onBack={() => go({ kind: "home" })} />;

  const sectionClasses = data.classes.filter((c) => c.section_id === sectionId);
  const students = data.studentsIn(sectionId);
  const notYetAdded = data.subjects.filter((s) => !sectionClasses.some((c) => c.subject_id === s.id));

  return (
    <>
      <BackHeader
        back="Sections"
        onBack={() => go({ kind: "home" })}
        title={section.name}
        subtitle={`${students.length} student${students.length === 1 ? "" : "s"} · ${sectionClasses.length} subject${sectionClasses.length === 1 ? "" : "s"}`}
        action={
          <MoreActions
            title={section.name}
            items={[
              {
                label: "Rename section",
                icon: <Pencil className="size-5" />,
                onClick: () =>
                  openSheet(<RenameSheet title="Rename section" value={section.name} onSave={async (v) => { await renameSection(section.id, v); bumpData(); }} />),
              },
              {
                label: "Delete section",
                icon: <Trash2 className="size-5" />,
                danger: true,
                onClick: () =>
                  openSheet(
                    <ConfirmSheet
                      title={`Delete ${section.name}?`}
                      text="The section and its subject links are removed. Students stay (without a section). Activities given only to this section stay in your list."
                      onConfirm={async () => { await deleteSection(section.id); bumpData(); go({ kind: "home" }); }}
                    />,
                  ),
              },
            ]}
          />
        }
      />
      <PageBody>
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Subjects in this section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Subjects</h2>
              <AddPill guide="add-subject" label="Add subject" onClick={() => openSheet(<AddSubjectSheet data={data} section={section} />)} />
            </div>
            {sectionClasses.length === 0 ? (
              <p className="rounded-[22px] bg-white p-5 text-sm text-muted">No subjects yet. Tap “Add subject”.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {sectionClasses.map((c, i) => {
                  const subj = data.subjects.find((s) => s.id === c.subject_id);
                  const acts = data.activities.filter((a) => a.subject_id === c.subject_id && data.sectionsOfActivity(a.id).includes(sectionId));
                  return (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...spring, delay: Math.min(i, 8) * 0.04 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => go({ kind: "class", classId: c.id })}
                      data-guide="subject-tile"
                      className="rounded-[22px] bg-white p-3.5 text-left transition-shadow hover:shadow-[0_14px_40px_-16px_rgba(20,20,40,0.25)]"
                    >
                      <SubjectIcon name={subj?.name ?? ""} size="sm" />
                      <p className="mt-2.5 truncate text-sm font-semibold">{subj?.name}</p>
                      <p className="text-xs text-muted">{acts.length} activit{acts.length === 1 ? "y" : "ies"}</p>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Students in this section */}
          <div className="mt-7 lg:mt-0" data-guide="section-students">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Students</h2>
              <AddPill label="Add students" icon={<UserPlus className="size-4" />} onClick={() => openSheet(<AddStudentsSheet data={data} section={section} />)} />
            </div>
            {students.length === 0 ? (
              <p className="rounded-[22px] bg-white p-5 text-sm text-muted">No students yet. Tap “Add students”.</p>
            ) : (
              groupBySex(students).map((g) => (
                <div key={g.key} className="mb-3">
                  <p className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
                    {g.label} · {g.items.length}
                  </p>
              <Card className="p-2">
                <ul>
                  {g.items.map((st) => (
                    <li key={st.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                      <Avatar name={st.full_name} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{displayName(st)}</p>
                        <p className="truncate text-xs text-muted">@{st.username}</p>
                      </div>
                      <IconButton
                        variant="soft"
                        size={32}
                        aria-label={`Remove ${st.full_name} from section`}
                        onClick={() =>
                          openSheet(
                            <ConfirmSheet
                              title={`Remove ${st.full_name}?`}
                              text={`They'll be taken out of ${section.name} (their account and past submissions stay).`}
                              confirmLabel="Remove"
                              onConfirm={async () => { await setStudentSection(st.id, null); bumpData(); }}
                            />,
                          )
                        }
                      >
                        <X className="size-3.5" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              </Card>
                </div>
              ))
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}

/** Pick existing students for a section, or create a new one in it. */
function AddStudentsSheet({ data, section }: { data: TeacherData; section: Section }) {
  const { openSheet, closeSheet, bumpData } = useUI();
  const candidates = data.students.filter((s) => data.sectionOf(s.id) !== section.id);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionName = (id: string | null) => data.sections.find((s) => s.id === id)?.name;

  return (
    <div className="pt-1">
      <SheetHeader title={`Add students to ${section.name}`} />
      <PrimaryButton
        variant="soft"
        className="mb-4 w-full"
        onClick={() =>
          openSheet(
            <AccountForm
              role="student"
              sections={data.sections}
              defaultSectionId={section.id}
              saveSection={setStudentSection}
              onSaved={bumpData}
            />,
          )
        }
      >
        <UserPlus className="size-4" /> Create a new student
      </PrimaryButton>

      {candidates.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">All your students are already in this section.</p>
      ) : (
        <>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Or pick existing students</p>
          <ul className="max-h-[45dvh] space-y-1 overflow-y-auto">
            {candidates.map((st) => {
              const on = picked.includes(st.id);
              const current = sectionName(data.sectionOf(st.id));
              return (
                <li key={st.id}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPicked((p) => (on ? p.filter((x) => x !== st.id) : [...p, st.id]))}
                    className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors", on ? "bg-lilac-soft" : "hover:bg-soft")}
                  >
                    <span className={cn("grid size-5 place-items-center rounded-md border-2 transition-colors", on ? "border-lilac-deep bg-lilac-deep text-white" : "border-ink/30")}>
                      {on && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <Avatar name={st.full_name} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{displayName(st)}</p>
                      <p className="truncate text-xs text-muted">{current ? `Now in ${current} — will move` : "No section yet"}</p>
                    </div>
                  </motion.button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3">
            <ErrorNote message={error} />
          </div>
          <PrimaryButton
            className="mt-3 w-full"
            disabled={!picked.length}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                for (const id of picked) await setStudentSection(id, section.id);
                bumpData();
                closeSheet();
              } catch (e) {
                setError(msg(e));
                setBusy(false);
              }
            }}
          >
            Add {picked.length || ""} student{picked.length === 1 ? "" : "s"}
          </PrimaryButton>
        </>
      )}
    </div>
  );
}

/* ====================== Level 2: a class (section × subject) ====================== */

function useClassContext(data: TeacherData, classId: string) {
  const cls = data.classes.find((c) => c.id === classId) as ClassRow | undefined;
  const section = cls && data.sections.find((s) => s.id === cls.section_id);
  const subject = cls && data.subjects.find((s) => s.id === cls.subject_id);
  /** Sections that take this subject — where an activity can be given. */
  const subjectSections = cls
    ? data.sections.filter((s) => data.classes.some((c) => c.section_id === s.id && c.subject_id === cls.subject_id))
    : [];
  const activities = cls
    ? data.activities.filter((a) => a.subject_id === cls.subject_id && data.sectionsOfActivity(a.id).includes(cls.section_id))
    : [];
  const work = cls ? data.work.filter((w) => w.sectionId === cls.section_id && w.activity.subject_id === cls.subject_id) : [];
  return { cls, section, subject, subjectSections, activities, work };
}

function ClassView({ data, classId, go }: { data: TeacherData; classId: string; go: (v: View) => void }) {
  const { openSheet, bumpData } = useUI();
  const [tab, setTab] = useState<"students" | "activities">("activities");
  const { cls, section, subject, subjectSections, activities, work } = useClassContext(data, classId);
  if (!cls || !section || !subject) return <Missing onBack={() => go({ kind: "home" })} />;

  const students = data.studentsIn(section.id);
  const newActivity = () =>
    openSheet(<ActivityForm subject={subject} sections={subjectSections} defaultSectionId={section.id} onSaved={bumpData} />);

  return (
    <>
      <BackHeader
        back={section.name}
        onBack={() => go({ kind: "section", sectionId: section.id })}
        title={subject.name}
        subtitle={`${section.name} · ${students.length} student${students.length === 1 ? "" : "s"}`}
        action={
          <div className="flex items-center gap-2">
            <MoreActions
              title={`${subject.name} · ${section.name}`}
              items={[
                {
                  label: `Remove ${subject.name} from this section`,
                  icon: <Trash2 className="size-5" />,
                  danger: true,
                  onClick: () =>
                    openSheet(
                      <ConfirmSheet
                        title={`Remove ${subject.name} from ${section.name}?`}
                        text="The subject stays in your list and its activities stay, but this section won't show it anymore."
                        confirmLabel="Remove"
                        onConfirm={async () => { await removeClass(cls.id); bumpData(); go({ kind: "section", sectionId: section.id }); }}
                      />,
                    ),
                },
              ]}
            />
            <PrimaryButton guide="new-activity" className="hidden lg:flex" onClick={newActivity}>
              <Plus className="size-4" /> New activity
            </PrimaryButton>
          </div>
        }
      />
      <PageBody>
        <Segmented
          className="mb-4"
          layoutId="class-tab"
          size="md"
          options={[
            { value: "activities", label: `Activities · ${activities.length}` },
            { value: "students", label: `Students · ${students.length}` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {tab === "activities" && (
              <PrimaryButton guide="new-activity" className="mb-4 w-full lg:hidden" onClick={newActivity}>
                <Plus className="size-4" /> New activity
              </PrimaryButton>
            )}
            {tab === "activities" ? (
              activities.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="size-7" />}
                  title="No activities yet"
                  text="Create one: choose a category, at home or face to face, and which sections get it."
                  action={<PrimaryButton guide="new-activity" onClick={newActivity}><Plus className="size-4" /> New activity</PrimaryButton>}
                />
              ) : (
                <div className="space-y-6">
                  {CATEGORIES.map((cat) => {
                    const list = activities.filter((a) => a.category === cat.value);
                    return (
                      <section key={cat.value}>
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-2">
                          {cat.label}
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-muted">{list.length}</span>
                        </h3>
                        {list.length === 0 ? (
                          <p className="rounded-[20px] border-2 border-dashed border-ink/10 p-4 text-center text-xs text-muted">None yet</p>
                        ) : (
                          <div className="grid gap-2.5 lg:grid-cols-2">
                            {list.map((a, i) => {
                              const w = work.filter((x) => x.activity.id === a.id);
                              const done = w.filter((x) => x.submission).length;
                              return (
                                <Card
                                  key={a.id}
                                  guide="activity-card"
                                  delay={Math.min(i, 6) * 0.03}
                                  className="p-4"
                                  onClick={() =>
                                    openSheet(
                                      <ActivitySheet
                                        activity={a}
                                        subject={subject}
                                        subjectSections={subjectSections}
                                        activitySectionIds={data.sectionsOfActivity(a.id)}
                                        work={w}
                                        onChanged={bumpData}
                                      />,
                                    )
                                  }
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold leading-snug">{a.title}</p>
                                    <ModeBadge mode={a.mode} />
                                  </div>
                                  <p className="mt-1 text-xs text-muted">{a.due_at ? `Due ${fmtDate(a.due_at)}` : "No due date"}</p>
                                  <div className="mt-3 mb-1.5 flex justify-between text-xs text-muted">
                                    <span>{a.mode === "f2f" ? "Papers in" : "Submitted"}</span>
                                    <span className="text-ink tabular-nums">{done}/{w.length}</span>
                                  </div>
                                  <ProgressBar value={w.length ? Math.round((done / w.length) * 100) : 0} />
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )
            ) : students.length === 0 ? (
              <EmptyState
                icon={<Users className="size-7" />}
                title="No students in this section"
                text={`Add students to ${section.name} first.`}
                action={<PrimaryButton onClick={() => go({ kind: "section", sectionId: section.id })}>Go to {section.name}</PrimaryButton>}
              />
            ) : (
              groupBySex(students).map((g) => (
                <div key={g.key} className="mb-3">
                  <p className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
                    {g.label} · {g.items.length}
                  </p>
              <Card className="p-2">
                <ul>
                  {g.items.map((st) => {
                    const w = work.filter((x) => x.student.id === st.id);
                    const done = w.filter((x) => x.submission).length;
                    const overdue = w.filter((x) => x.overdue).length;
                    return (
                      <li key={st.id}>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => go({ kind: "student", classId, studentId: st.id })}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-soft"
                        >
                          <Avatar name={st.full_name} size={38} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{displayName(st)}</p>
                            <p className="text-xs text-muted">
                              {done}/{w.length} done{overdue ? <span className="font-medium text-red-500"> · {overdue} overdue</span> : null}
                            </p>
                          </div>
                          <ChevronRight className="size-4 text-muted" />
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </PageBody>
    </>
  );
}

/* ====================== Level 3: one student in a class ====================== */

function StudentView({ data, classId, studentId, go }: { data: TeacherData; classId: string; studentId: string; go: (v: View) => void }) {
  const { openSheet } = useUI();
  const { cls, section, subject, work } = useClassContext(data, classId);
  const student = data.students.find((s) => s.id === studentId);
  if (!cls || !section || !subject || !student) return <Missing onBack={() => go({ kind: "home" })} />;
  const mine = work.filter((w) => w.student.id === studentId);

  return (
    <>
      <BackHeader
        back={`${subject.name} · ${section.name}`}
        onBack={() => go({ kind: "class", classId })}
        title={displayName(student)}
        subtitle={`@${student.username} · ${mine.filter((w) => w.submission).length}/${mine.length} done`}
        action={<Avatar name={student.full_name} size={48} />}
      />
      <PageBody>
        <div className="space-y-6">
          {CATEGORIES.map((cat) => {
            const list = mine.filter((w) => w.activity.category === cat.value);
            return (
              <section key={cat.value}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-2">
                  {cat.label}
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-muted">{list.length}</span>
                </h3>
                {list.length === 0 ? (
                  <p className="rounded-[20px] border-2 border-dashed border-ink/10 p-4 text-center text-xs text-muted">None yet</p>
                ) : (
                  <div className="grid gap-2.5 lg:grid-cols-2">
                    {list.map((w, i) => (
                      <StudentWorkCard key={w.key} w={w} index={i} onOpen={() => openSheet(<WorkSheet w={w} />)} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}

function StudentWorkCard({ w, index, onOpen }: { w: StudentWork; index: number; onOpen: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { ...spring, delay: Math.min(index, 6) * 0.04 } }}
      whileTap={{ scale: 0.98 }}
      transition={snappy}
      onClick={onOpen}
      className="w-full rounded-[22px] bg-white p-4 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold leading-snug">{w.activity.title}</p>
        <WorkLabels w={w} />
      </div>
      <div className="mt-1.5">
        <ModeBadge mode={w.activity.mode} />
      </div>
      <ProgressBar value={WORK_PROGRESS[w.status]} className="mt-3" />
      <p className={cn("mt-2 text-xs", w.overdue ? "font-medium text-red-500" : "text-muted")}>
        {w.submission
          ? `${w.activity.mode === "f2f" ? "Captured" : "Submitted"} ${fmtDate(w.submission.submitted_at)}`
          : w.activity.due_at
            ? `Due ${fmtDate(w.activity.due_at)}`
            : "No due date"}
      </p>
    </motion.button>
  );
}

function Missing({ onBack }: { onBack: () => void }) {
  return (
    <PageBody>
      <div className="pt-[max(20px,env(safe-area-inset-top))]">
        <EmptyState
          icon={<LayoutGrid className="size-7" />}
          title="Not found"
          text="This was removed or is still loading."
          action={<PrimaryButton onClick={onBack}>Back to Sections</PrimaryButton>}
        />
      </div>
    </PageBody>
  );
}


/** Desktop: separate icon buttons. Mobile: one "•••" button opening an action sheet. */
function MoreActions({
  title,
  items,
}: {
  title: string;
  items: { label: string; icon: ReactNode; danger?: boolean; onClick: () => void }[];
}) {
  const { openSheet } = useUI();
  return (
    <>
      <div className="hidden gap-2 lg:flex">
        {items.map((it) => (
          <IconButton key={it.label} variant={it.danger ? "danger" : "soft"} aria-label={it.label} onClick={it.onClick}>
            {it.icon}
          </IconButton>
        ))}
      </div>
      <IconButton
        variant="soft"
        size={44}
        className="lg:hidden"
        aria-label="More options"
        onClick={() => openSheet(<ActionSheet title={title} actions={items} />)}
      >
        <MoreHorizontal className="size-5" />
      </IconButton>
    </>
  );
}

/** Labelled add button for section headings (clear and easy to tap). */
function AddPill({ label, icon, onClick, guide }: { label: string; icon?: ReactNode; onClick: () => void; guide?: string }) {
  return (
    <motion.button
      data-guide={guide}
      whileTap={{ scale: 0.95 }}
      transition={snappy}
      onClick={onClick}
      className="flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium ring-1 ring-line transition-colors hover:bg-soft max-lg:h-11"
    >
      {icon ?? <Plus className="size-4" />} {label}
    </motion.button>
  );
}

/** Add one of the teacher's subjects to a section, or create a new one. */
function AddSubjectSheet({ data, section }: { data: TeacherData; section: Section }) {
  const { closeSheet, bumpData } = useUI();
  const taken = data.classes.filter((c) => c.section_id === section.id).map((c) => c.subject_id);
  const available = data.subjects.filter((s) => !taken.includes(s.id));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = async (subjectId: string) => {
    setBusy(subjectId);
    setError(null);
    try {
      await addClass(section.id, subjectId);
      bumpData();
      closeSheet();
    } catch (e) {
      setError(msg(e));
      setBusy(null);
    }
  };

  return (
    <div className="pt-1" data-guide="subject-sheet">
      <SheetHeader title={`Add a subject to ${section.name}`} />
      {available.length > 0 && (
        <>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Your subjects</p>
          <div className="mb-5 overflow-hidden rounded-[22px] bg-soft">
            {available.map((s, i) => (
              <button
                key={s.id}
                disabled={!!busy}
                onClick={() => add(s.id)}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 px-4 text-left font-medium transition-colors active:bg-line disabled:opacity-60",
                  i > 0 && "border-t border-white",
                )}
              >
                <SubjectIcon name={s.name} size="sm" />
                <span className="flex-1 truncate">{s.name}</span>
                {busy === s.id ? <span className="text-xs text-muted">Adding…</span> : <Plus className="size-4 text-muted" />}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
        {available.length ? "Or create a new subject" : "Create a subject"}
      </p>
      <InlineAdd
        autoFocus={!available.length}
        placeholder="e.g. Science"
        onAdd={async (n) => {
          const subj = await addSubject(n);
          await addClass(section.id, subj.id);
          bumpData();
          closeSheet();
        }}
      />
      <div className="mt-3">
        <ErrorNote message={error} />
      </div>
    </div>
  );
}
