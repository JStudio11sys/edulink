import { supabase } from "./supabase";
import type { AnswerKey, TestPart } from "./test";
import type {
  Activity,
  ActivityMode,
  ActivityOpen,
  ActivityReview,
  ActivitySection,
  Category,
  ClassRow,
  Lesson,
  Note,
  PersonalTask,
  Profile,
  Role,
  Section,
  SectionStudent,
  Subject,
  Submission,
} from "./types";

type Result<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>;

async function run<T>(p: Result<T>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

/* ---------- People ---------- */
// Row Level Security decides who is visible: admin sees all, teachers see their own students.
export const getProfiles = (role: Role) =>
  run<Profile[]>(supabase.from("profiles").select("*").eq("role", role).order("full_name"));

/* ---------- Sections (teacher-owned) ---------- */
export const getSections = () => run<Section[]>(supabase.from("sections").select("*").order("name"));
export const addSection = (name: string) =>
  run<Section>(supabase.from("sections").insert({ name: name.trim() }).select().single());
export const renameSection = (id: string, name: string) =>
  run(supabase.from("sections").update({ name: name.trim() }).eq("id", id));
export const deleteSection = (id: string) => run(supabase.from("sections").delete().eq("id", id));

/* ---------- Subjects (teacher-owned) ---------- */
export const getSubjects = () => run<Subject[]>(supabase.from("subjects").select("id, name, teacher_id").order("name"));
export const addSubject = (name: string) =>
  run<Subject>(supabase.from("subjects").insert({ name: name.trim() }).select("id, name, teacher_id").single());
export const renameSubject = (id: string, name: string) =>
  run(supabase.from("subjects").update({ name: name.trim() }).eq("id", id));
export const deleteSubject = (id: string) => run(supabase.from("subjects").delete().eq("id", id));

/* ---------- Classes (section × subject) ---------- */
export const getClasses = () => run<ClassRow[]>(supabase.from("classes").select("*"));
export const addClass = (sectionId: string, subjectId: string) =>
  run<ClassRow>(supabase.from("classes").insert({ section_id: sectionId, subject_id: subjectId }).select().single());
export const removeClass = (id: string) => run(supabase.from("classes").delete().eq("id", id));

/* ---------- Students in sections ---------- */
export const getSectionStudents = () => run<SectionStudent[]>(supabase.from("section_students").select("student_id, section_id"));

/** Put a student in a section (or remove them from any section with null). */
export async function setStudentSection(studentId: string, sectionId: string | null) {
  if (!sectionId) return run(supabase.from("section_students").delete().eq("student_id", studentId));
  return run(
    supabase.from("section_students").upsert({ student_id: studentId, section_id: sectionId }, { onConflict: "student_id" }),
  );
}

/* ---------- Activities ---------- */
export const getActivities = () =>
  run<Activity[]>(supabase.from("activities").select("*").order("created_at", { ascending: false }));
export const getActivitySections = () =>
  run<ActivitySection[]>(supabase.from("activity_sections").select("activity_id, section_id"));

export interface ActivityInput {
  id?: string;
  subject_id: string;
  title: string;
  instructions: string;
  category: Category;
  mode: ActivityMode;
  due_at: string | null;
  section_ids: string[];
  /** Test structure (students can see it). */
  parts?: TestPart[];
  /** Answers (teacher only) — saved to activity_keys. */
  key?: AnswerKey;
}

/** Create or update an activity and the sections it's given to. */
export async function saveActivity(a: ActivityInput) {
  const row = {
    subject_id: a.subject_id,
    title: a.title,
    instructions: a.instructions,
    category: a.category,
    mode: a.mode,
    due_at: a.due_at,
    ...(a.parts ? { parts: a.parts } : {}),
  };
  let id = a.id;
  if (id) await run(supabase.from("activities").update(row).eq("id", id));
  else id = (await run<Activity>(supabase.from("activities").insert(row).select().single())).id;

  const current = (await run<ActivitySection[]>(supabase.from("activity_sections").select("*").eq("activity_id", id))).map(
    (r) => r.section_id,
  );
  const add = a.section_ids.filter((s) => !current.includes(s));
  const remove = current.filter((s) => !a.section_ids.includes(s));
  if (add.length) await run(supabase.from("activity_sections").insert(add.map((section_id) => ({ activity_id: id, section_id }))));
  if (remove.length) await run(supabase.from("activity_sections").delete().eq("activity_id", id).in("section_id", remove));
  if (a.key) {
    const { error } = await supabase.from("activity_keys").upsert({ activity_id: id, answers: a.key }, { onConflict: "activity_id" });
    if (error)
      throw new Error(
        /relation .* does not exist|schema cache/i.test(error.message)
          ? "Answer keys aren't set up yet — run 0009_activity_keys.sql in Supabase."
          : error.message,
      );
  }
  return id;
}
/** The private answer key (teacher only). Empty if none / not set up. */
export async function getActivityKey(activityId: string): Promise<AnswerKey> {
  const { data, error } = await supabase.from("activity_keys").select("answers").eq("activity_id", activityId).maybeSingle();
  if (error || !data) return {};
  return (data.answers ?? {}) as AnswerKey;
}

export const deleteActivity = (id: string) => run(supabase.from("activities").delete().eq("id", id));

/* ---------- Submissions ---------- */
export const getSubmissions = () =>
  run<Submission[]>(supabase.from("submissions").select("*").order("submitted_at", { ascending: false }));

export async function photoUrl(path: string) {
  const { data, error } = await supabase.storage.from("submissions").createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/* ---------- Edge Functions ---------- */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    let detail = "";
    try {
      const raw = (await ctx?.text()) ?? "";
      try {
        const payload = JSON.parse(raw);
        detail = payload?.error ?? payload?.message ?? payload?.msg ?? raw;
      } catch {
        detail = raw;
      }
    } catch {
      /* body unavailable */
    }
    const status = ctx?.status ? ` (${ctx.status})` : "";
    if (ctx?.status === 404) detail = `The "${name}" function isn't deployed.`;
    throw new Error(`${(detail || error.message).toString().slice(0, 300)}${status}`);
  }
  return data as T;
}

type NameParts = { full_name?: string; first_name?: string; last_name?: string; sex?: "female" | "male" | null };
type CreateUser = { action: "create"; role: Role; username: string; password: string } & NameParts;
type UpdateUser = { action: "update"; id: string; username?: string; password?: string } & NameParts;
type DeleteUser = { action: "delete"; id: string };

export const manageUsers = (body: CreateUser | UpdateUser | DeleteUser) =>
  callFunction<{ id?: string; ok?: boolean }>("manage-users", body);

/* ---------- Personal dashboard ---------- */

export const getTasks = () =>
  run<PersonalTask[]>(supabase.from("personal_tasks").select("*").order("created_at", { ascending: false }));
export const insertTask = (t: Omit<PersonalTask, "id" | "owner_id" | "created_at">) =>
  run<PersonalTask>(supabase.from("personal_tasks").insert(t).select().single());
export const updateTask = (id: string, patch: Partial<PersonalTask>) =>
  run(supabase.from("personal_tasks").update(patch).eq("id", id));
export const removeTask = (id: string) => run(supabase.from("personal_tasks").delete().eq("id", id));

export const getNotes = () =>
  run<Note[]>(supabase.from("notes").select("*").order("updated_at", { ascending: false }));
export const insertNote = (n: Pick<Note, "title" | "body" | "color">) =>
  run<Note>(supabase.from("notes").insert(n).select().single());
export const updateNote = (id: string, patch: Partial<Note>) => run(supabase.from("notes").update(patch).eq("id", id));
export const removeNote = (id: string) => run(supabase.from("notes").delete().eq("id", id));

export const getLessons = () =>
  run<Lesson[]>(supabase.from("timetable").select("*").order("weekday").order("start_time"));
export const insertLesson = (l: Omit<Lesson, "id" | "owner_id">) =>
  run<Lesson>(supabase.from("timetable").insert(l).select().single());
export const updateLesson = (id: string, patch: Partial<Lesson>) =>
  run(supabase.from("timetable").update(patch).eq("id", id));
export const removeLesson = (id: string) => run(supabase.from("timetable").delete().eq("id", id));

/* ---------- Student submission ---------- */
/** Reads the handwriting on one or more pages (data URLs), in order. */
export const transcribe = async (images: string[]) => {
  const res = await callFunction<{ text: string }>("transcribe", { images });
  return { ...res, text: orderNumbered(res.text ?? "") };
};

/**
 * Answer sheets written in columns come back as "1. T 6. F".
 * Put numbered answers one per line in number order (1, 2, 3 …); other text is kept as is.
 * Each "Page N" block is sorted on its own.
 */
export function orderNumbered(text: string) {
  return text
    .split(/(?=^Page \d+\s*$)/m)
    .map(orderBlock)
    .join("");
}

function orderBlock(block: string) {
  const lines = block.split(/\r?\n/);
  const head: string[] = [];
  const tail: string[] = [];
  const items: { n: number; answer: string }[] = [];
  for (const line of lines) {
    const pieces = line.trim() ? line.trim().split(/\s+(?=\d{1,3}\s*[.)](?:\s|$))/) : [];
    const parsed = pieces.map((p) => p.match(/^(\d{1,3})\s*[.)]\s*(.*)$/));
    if (pieces.length && parsed.every(Boolean)) {
      for (const m of parsed) items.push({ n: Number(m![1]), answer: m![2].trim() });
    } else if (!line.trim()) {
      continue; // blank lines between columns
    } else if (items.length) tail.push(line);
    else head.push(line);
  }
  // Only short, unique numbered answers (an answer sheet) — leave essays alone
  const unique = new Set(items.map((i) => i.n)).size === items.length;
  const short = items.every((i) => i.answer.length <= 30);
  if (items.length < 3 || !unique || !short || tail.length > 2) return block;
  const sorted = [...items].sort((x, y) => x.n - y.n).map((i) => `${i.n}. ${i.answer}`.trimEnd());
  const end = /\n$/.test(block) ? "\n" : "";
  return [...head, ...sorted, ...tail].join("\n") + end;
}

/** Uploads every page in order, then saves the submission. Locked for the student afterwards. */
export async function submitWork(studentId: string, activityId: string, photos: Blob[], text: string) {
  if (!photos.length) throw new Error("Add at least one photo.");
  const stamp = Date.now();
  const paths: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const path = `${studentId}/${activityId}/${stamp}-p${i + 1}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("submissions")
      .upload(path, photos[i], { contentType: "image/jpeg", upsert: false });
    if (upErr) throw new Error(`Page ${i + 1}: ${upErr.message}`);
    paths.push(path);
  }
  const { error } = await supabase
    .from("submissions")
    .insert({ activity_id: activityId, student_id: studentId, image_path: paths[0], image_paths: paths, text });
  if (error) throw new Error(/duplicate/i.test(error.message) ? "Already submitted for this activity." : error.message);
}

/* ---------- Activity opens ("In progress") ---------- */
/** Activity ids this student has opened. Returns [] if the table isn't set up yet. */
export async function getOpenedActivityIds(): Promise<string[]> {
  const { data, error } = await supabase.from("activity_opens").select("activity_id");
  if (error) return [];
  return (data ?? []).map((r: { activity_id: string }) => r.activity_id);
}

/** Records the first time a student opens an activity (later opens are ignored). */
export async function markActivityOpened(activityId: string) {
  const { error } = await supabase
    .from("activity_opens")
    .upsert({ activity_id: activityId }, { onConflict: "student_id,activity_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

/* ---------- Teacher reviews + opens (teacher side) ---------- */

/** Opens visible to the caller (teacher: their activities). [] if the table isn't set up. */
export async function getOpens(): Promise<ActivityOpen[]> {
  const { data, error } = await supabase.from("activity_opens").select("*");
  return error ? [] : ((data ?? []) as ActivityOpen[]);
}

/** Reviews visible to the caller. [] if the table isn't set up yet. */
export async function getReviews(): Promise<ActivityReview[]> {
  const { data, error } = await supabase.from("activity_reviews").select("*");
  return error ? [] : ((data ?? []) as ActivityReview[]);
}

export async function getReview(activityId: string, studentId: string): Promise<ActivityReview | null> {
  const { data, error } = await supabase
    .from("activity_reviews")
    .select("*")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();
  return error ? null : (data as ActivityReview | null);
}

export async function saveReview(
  activityId: string,
  studentId: string,
  patch: { comment?: string; checked?: boolean },
) {
  const row: Record<string, unknown> = { activity_id: activityId, student_id: studentId, ...patch };
  if (patch.checked !== undefined) row.checked_at = patch.checked ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from("activity_reviews")
    .upsert(row, { onConflict: "activity_id,student_id" })
    .select()
    .single();
  if (error)
    throw new Error(
      /relation .* does not exist|schema cache/i.test(error.message)
        ? "Reviews aren't set up yet — run 0005_activity_reviews.sql in Supabase."
        : error.message,
    );
  return data as ActivityReview;
}
