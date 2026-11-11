export type Role = "admin" | "teacher" | "student";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  sex?: "female" | "male" | null;
  username: string;
  created_by: string | null;
  created_at: string;
}

/* ---------- Teacher-owned structure ---------- */
export interface Section {
  id: string;
  teacher_id: string;
  name: string;
  created_at: string;
}

export interface Subject {
  id: string;
  teacher_id?: string;
  name: string;
}

/** A class = one subject taught to one section. */
export interface ClassRow {
  id: string;
  teacher_id: string;
  section_id: string;
  subject_id: string;
}

export interface SectionStudent {
  student_id: string;
  section_id: string;
}

export type Category = "written" | "performance" | "summative" | "assessment";
export type ActivityMode = "home" | "f2f";

export const CATEGORIES: { value: Category; label: string; short: string }[] = [
  { value: "written", label: "Written Work / Oral Recitation", short: "Written / Oral" },
  { value: "performance", label: "Performance Task", short: "Performance" },
  { value: "summative", label: "Summative Test", short: "Summative" },
  { value: "assessment", label: "Assessment", short: "Assessment" },
];
export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

export interface Activity {
  id: string;
  teacher_id: string;
  subject_id: string;
  title: string;
  instructions: string;
  category: Category;
  mode: ActivityMode;
  parts: unknown[];
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivitySection {
  activity_id: string;
  section_id: string;
}

export interface Submission {
  id: string;
  activity_id: string;
  student_id: string;
  image_path: string;
  /** All pages in order (page 1 first). */
  image_paths?: string[];
  text: string;
  submitted_at: string;
}

/* ---------- Personal dashboard (teachers & admin) ---------- */
export type TaskStatus = "todo" | "progress" | "done";

export interface PersonalTask {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  tag: string;
  due_date: string | null; // YYYY-MM-DD
  status: TaskStatus;
  progress: number;
  created_at: string;
}

export type NoteColor = "mint" | "lilac" | "peach" | "sky";

export interface Note {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  color: NoteColor;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  owner_id: string;
  weekday: number; // 1 = Monday … 7 = Sunday
  start_time: string; // "HH:MM:SS"
  end_time: string;
  subject: string;
  room: string;
}

/* ---------- Teacher review of a student's activity ---------- */
export interface ActivityReview {
  activity_id: string;
  student_id: string;
  comment: string;
  checked: boolean;
  checked_at: string | null;
  updated_at: string;
}

export interface ActivityOpen {
  activity_id: string;
  student_id: string;
  opened_at: string;
}
