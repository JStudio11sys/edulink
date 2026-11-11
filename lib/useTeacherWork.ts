import { startOfWeek } from "./format";
import { useTeacherData, type StudentWork } from "./useTeacherData";
import { compareStudents } from "./names";

export { WORK_PROGRESS, type StudentWork, type WorkStatus } from "./useTeacherData";

/**
 * Weekly tracker for the teacher's "Weekly Ongoing Tasks":
 * To do = not opened, In progress = opened, Done = submitted this week (resets Monday).
 */
export function useTeacherWork() {
  const d = useTeacherData();
  const weekStart = startOfWeek().getTime();

  const items: StudentWork[] = d.work
    .filter((w) => !w.submission || new Date(w.submission.submitted_at).getTime() >= weekStart)
    // Overdue first, then by due date, then student name
    .sort(
      (x, y) =>
        Number(y.overdue) - Number(x.overdue) ||
        (x.activity.due_at ?? "9999").localeCompare(y.activity.due_at ?? "9999") ||
        compareStudents(x.student, y.student),
    );

  return { ...d, items, mySubjects: d.subjects };
}
