import {
  getActivities,
  getActivitySections,
  getClasses,
  getOpens,
  getProfiles,
  getReviews,
  getSectionStudents,
  getSections,
  getSubjects,
  getSubmissions,
} from "./api";
import { useMe } from "./auth";
import { isOverdue } from "./format";
import { useUI } from "./store";
import type { Activity, ActivityReview, ClassRow, Profile, Section, Subject, Submission } from "./types";
import { useQuery } from "./useQuery";
import { sortStudents } from "./names";
import { getScores } from "./scores";

export type WorkStatus = "todo" | "progress" | "done";

/** One student's work on one activity. */
export interface StudentWork {
  key: string;
  activity: Activity;
  student: Profile;
  sectionId: string;
  subject: string;
  status: WorkStatus;
  submission?: Submission;
  review?: ActivityReview;
  /** Teacher-only score, if checked. */
  score?: { score: number; max: number; confirmed: boolean };
  overdue: boolean; // not submitted and past due
  late: boolean; // submitted after the due date
}

export const WORK_PROGRESS: Record<WorkStatus, number> = { todo: 0, progress: 50, done: 100 };

/** Everything a teacher's Sections / Classes / Students screens need. */
export function useTeacherData() {
  const me = useMe();
  const { dataVersion } = useUI();
  const q = useQuery(
    () =>
      Promise.all([
        getSections(),
        getSubjects(),
        getClasses(),
        getSectionStudents(),
        getProfiles("student"),
        getActivities(),
        getActivitySections(),
        getSubmissions(),
        getOpens(),
        getReviews(),
        getScores(),
      ]),
    [dataVersion],
  );
  const [sections, subjects, classes, members, students, activities, activitySections, submissions, opens, reviews, scores] =
    q.data ?? [[], [], [], [], [], [], [], [], [], [], []];

  const mySections = (sections as Section[]).filter((s) => s.teacher_id === me.id);
  const mySubjects = (subjects as Subject[]).filter((s) => s.teacher_id === me.id);
  const myClasses = (classes as ClassRow[]).filter((c) => c.teacher_id === me.id);
  const myActivities = activities.filter((a) => a.teacher_id === me.id);
  const myStudents = sortStudents(students.filter((s) => s.created_by === me.id));

  const subjectName = Object.fromEntries(mySubjects.map((s) => [s.id, s.name]));
  const sectionOf = (studentId: string) => members.find((m) => m.student_id === studentId)?.section_id ?? null;
  const studentsIn = (sectionId: string) =>
    sortStudents(myStudents.filter((s) => sectionOf(s.id) === sectionId));
  const sectionsOfActivity = (activityId: string) =>
    activitySections.filter((x) => x.activity_id === activityId).map((x) => x.section_id);

  /** Every (activity × student in its sections) pair. */
  const work: StudentWork[] = [];
  for (const a of myActivities) {
    for (const sectionId of sectionsOfActivity(a.id)) {
      for (const student of studentsIn(sectionId)) {
        const submission = submissions.find((s) => s.activity_id === a.id && s.student_id === student.id);
        const opened = opens.some((o) => o.activity_id === a.id && o.student_id === student.id);
        work.push({
          key: `${a.id}:${student.id}`,
          activity: a,
          student,
          sectionId,
          subject: subjectName[a.subject_id] ?? "",
          status: submission ? "done" : opened ? "progress" : "todo",
          submission,
          review: reviews.find((r) => r.activity_id === a.id && r.student_id === student.id),
          score: (() => {
            const s = scores.find((x) => x.activity_id === a.id && x.student_id === student.id);
            return s ? { score: Number(s.score), max: Number(s.max_score), confirmed: s.confirmed } : undefined;
          })(),
          // Face to face: the teacher captures the paper — no "opened", overdue or late for the student
          overdue: a.mode === "home" && !submission && isOverdue(a.due_at),
          late: a.mode === "home" && !!submission && !!a.due_at && new Date(submission.submitted_at) > new Date(a.due_at),
        });
      }
    }
  }

  return {
    ...q,
    sections: mySections,
    subjects: mySubjects,
    classes: myClasses,
    students: myStudents,
    activities: myActivities,
    work,
    sectionOf,
    studentsIn,
    sectionsOfActivity,
  };
}

export type TeacherData = ReturnType<typeof useTeacherData>;
