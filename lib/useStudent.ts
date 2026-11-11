import {
  getActivities,
  getClasses,
  getOpenedActivityIds,
  getProfiles,
  getSubjects,
  getSubmissions,
} from "./api";
import { useUI } from "./store";
import { useMe } from "./auth";
import { isOverdue } from "./format";
import type { Activity, Subject, Submission } from "./types";
import { useQuery } from "./useQuery";

/** Which tab an activity belongs to. */
export type StudentStatus = "todo" | "overdue" | "submitted";

export interface StudentActivity {
  activity: Activity;
  subject: string;
  teacher?: string;
  submission?: Submission;
  status: StudentStatus;
  /** Opened at least once (but not submitted) → "In progress". */
  started: boolean;
  /** Submitted after the due date. */
  late: boolean;
}

/** The pill shown on an activity. */
export function statusLabel(i: StudentActivity): { label: string; tone: string } {
  if (i.status === "submitted")
    return i.late ? { label: "Late", tone: "bg-red-500 text-white" } : { label: "On time", tone: "bg-mint text-mint-deep" };
  if (i.status === "overdue") return { label: "Overdue", tone: "bg-red-500 text-white" };
  return i.started
    ? { label: "In progress", tone: "bg-peach text-peach-deep" }
    : { label: "Not started", tone: "bg-lilac text-white" };
}

const ORDER: Record<StudentStatus, number> = { overdue: 0, todo: 1, submitted: 2 };

/** Everything the student pages need, with status worked out per activity. */
export function useStudentData() {
  const me = useMe();
  const { dataVersion } = useUI();
  const q = useQuery(
    () =>
      Promise.all([
        getActivities(),
        getSubjects(),
        getClasses(),
        getSubmissions(),
        getProfiles("teacher"),
        getOpenedActivityIds(),
      ]),
    [dataVersion],
  );
  const [activities, subjects, classes, submissions, teachers, opened] = q.data ?? [[], [], [], [], [], []];

  const subjectName = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  const teacherName = Object.fromEntries(teachers.map((t) => [t.id, t.full_name]));

  const items: StudentActivity[] = activities
    .map((a) => {
      const submission = submissions.find((s) => s.activity_id === a.id && s.student_id === me.id);
      const status: StudentStatus = submission ? "submitted" : isOverdue(a.due_at) ? "overdue" : "todo";
      const late = !!submission && !!a.due_at && new Date(submission.submitted_at) > new Date(a.due_at);
      return {
        activity: a,
        subject: subjectName[a.subject_id] ?? "",
        teacher: teacherName[a.teacher_id],
        submission,
        status,
        started: opened.includes(a.id),
        late,
      };
    })
    .sort(
      (x, y) =>
        ORDER[x.status] - ORDER[y.status] ||
        (x.activity.due_at ?? "9999").localeCompare(y.activity.due_at ?? "9999"),
    );

  // Subjects = the classes of the student's section (RLS only returns those)
  const mySubjects: (Subject & { teacher?: string; pending: number; total: number })[] = classes
    .map((c) => {
      const subject = subjects.find((s) => s.id === c.subject_id);
      const list = items.filter((i) => i.activity.subject_id === c.subject_id);
      return {
        id: c.subject_id,
        name: subject?.name ?? "",
        teacher: teacherName[c.teacher_id],
        pending: list.filter((i) => i.status !== "submitted").length,
        total: list.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { ...q, items, mySubjects };
}
