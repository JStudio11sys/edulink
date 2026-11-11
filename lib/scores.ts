import { callFunction } from "./api";
import { supabase } from "./supabase";

/* ---------- Score details (teacher only) ---------- */
export interface ScoredItem {
  n: number;
  answer: string | null; // what the student wrote
  key: string; // correct answer
  correct: boolean;
  overridden?: boolean; // teacher flipped the check
}
export interface ScoredCriterion {
  criterion_id: string;
  label: string;
  max: number;
  points: number;
  reason: string;
}
export interface ScoredQuestion {
  question_id: string;
  prompt: string;
  criteria: ScoredCriterion[];
  score: number;
  max: number;
}
export interface ScoredPart {
  part_id: string;
  title: string;
  type: "truefalse" | "multiple" | "matching" | "essay";
  points_each?: number;
  items?: ScoredItem[];
  questions?: ScoredQuestion[];
  score: number;
  max: number;
}
export interface ScoreDetails {
  parts: ScoredPart[];
  notes?: string;
  model?: string;
}
export interface ActivityScore {
  activity_id: string;
  student_id: string;
  score: number;
  max_score: number;
  details: ScoreDetails;
  confirmed: boolean;
  graded_at: string;
}

/** Recompute part and total scores after the teacher changes something. */
export function recompute(details: ScoreDetails) {
  const parts = details.parts.map((p) => {
    if (p.type === "essay") {
      const questions = (p.questions ?? []).map((q) => {
        const score = q.criteria.reduce((s, c) => s + c.points, 0);
        return { ...q, score };
      });
      return { ...p, questions, score: questions.reduce((s, q) => s + q.score, 0) };
    }
    const score = (p.items ?? []).filter((it) => it.correct).length * (p.points_each ?? 1);
    return { ...p, score };
  });
  return {
    details: { ...details, parts },
    score: parts.reduce((s, p) => s + p.score, 0),
    max: parts.reduce((s, p) => s + p.max, 0),
  };
}

/** All scores visible to the caller (teacher: their activities). [] if not set up. */
export async function getScores(): Promise<ActivityScore[]> {
  const { data, error } = await supabase.from("activity_scores").select("*");
  return error ? [] : ((data ?? []) as ActivityScore[]);
}

export async function getScore(activityId: string, studentId: string): Promise<ActivityScore | null> {
  const { data, error } = await supabase
    .from("activity_scores")
    .select("*")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();
  return error ? null : (data as ActivityScore | null);
}

/** Ask the AI to score this student's work (also saves an unconfirmed score). */
export const gradeWork = (activityId: string, studentId: string) =>
  callFunction<{ score: number; max_score: number; details: ScoreDetails; confirmed: boolean }>("grade", {
    activity_id: activityId,
    student_id: studentId,
  });

/** Save the teacher's adjusted / confirmed score. */
export async function saveScore(activityId: string, studentId: string, details: ScoreDetails, confirmed: boolean) {
  const { details: d, score, max } = recompute(details);
  const { error } = await supabase
    .from("activity_scores")
    .upsert(
      { activity_id: activityId, student_id: studentId, details: d, score, max_score: max, confirmed },
      { onConflict: "activity_id,student_id" },
    );
  if (error) throw new Error(error.message);
}

export const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
