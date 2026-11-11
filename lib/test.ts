/* ---------- Test structure (visible to students) + answer key (teacher only) ---------- */

export type PartType = "truefalse" | "multiple" | "matching" | "essay";

export interface RubricCriterion {
  id: string;
  label: string; // e.g. "Content", "Organization"
  description: string; // what earns the points
  points: number;
}

export interface EssayQuestion {
  id: string;
  prompt: string;
  rubric: RubricCriterion[];
}

export interface TestPart {
  id: string;
  type: PartType;
  title: string; // "Part I"
  instructions: string;
  /** Objective parts: number of items and points per item. */
  items: number;
  points: number;
  /** Multiple choice: options per item (A–?). Matching: letters in column B. */
  choices: number;
  /** Essay only. */
  questions: EssayQuestion[];
}

/** Private answer key: answers per objective part, one entry per item ("T"/"F", "A"…). */
export type AnswerKey = Record<string, string[]>;

export const PART_TYPES: { value: PartType; label: string; hint: string }[] = [
  { value: "truefalse", label: "True / False", hint: "Each item is True or False" },
  { value: "multiple", label: "Multiple choice", hint: "Pick one letter per item" },
  { value: "matching", label: "Matching type", hint: "Match each item to a letter" },
  { value: "essay", label: "Essay", hint: "Scored with a rubric" },
];
export const partTypeLabel = (t: PartType) => PART_TYPES.find((p) => p.value === t)?.label ?? t;

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export const romanPart = (i: number) => `Part ${ROMAN[i] ?? i + 1}`;

export const letters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

export const uid = () => Math.random().toString(36).slice(2, 10);

export const newCriterion = (): RubricCriterion => ({ id: uid(), label: "", description: "", points: 5 });
export const newQuestion = (): EssayQuestion => ({
  id: uid(),
  prompt: "",
  rubric: [
    { id: uid(), label: "Content", description: "Answers the question with correct, relevant ideas", points: 5 },
    { id: uid(), label: "Organization", description: "Clear, logical structure", points: 3 },
    { id: uid(), label: "Grammar & mechanics", description: "Correct spelling, grammar and punctuation", points: 2 },
  ],
});

export function newPart(type: PartType, index: number): TestPart {
  return {
    id: uid(),
    type,
    title: romanPart(index),
    instructions: "",
    items: type === "essay" ? 0 : 10,
    points: 1,
    choices: type === "multiple" ? 4 : type === "matching" ? 10 : 2,
    questions: type === "essay" ? [newQuestion()] : [],
  };
}

export const questionTotal = (q: EssayQuestion) => q.rubric.reduce((s, c) => s + (Number(c.points) || 0), 0);

export const partTotal = (p: TestPart) =>
  p.type === "essay" ? p.questions.reduce((s, q) => s + questionTotal(q), 0) : p.items * p.points;

export const testTotal = (parts: TestPart[]) => parts.reduce((s, p) => s + partTotal(p), 0);

/** Options a key cell can take for a part. */
export const keyOptions = (p: TestPart) => (p.type === "truefalse" ? ["T", "F"] : letters(p.choices));

/** Items in the key that are still blank. */
export const missingKeys = (parts: TestPart[], key: AnswerKey) =>
  parts
    .filter((p) => p.type !== "essay")
    .reduce((n, p) => n + Array.from({ length: p.items }, (_, i) => key[p.id]?.[i]).filter((v) => !v).length, 0);

/** Parse whatever is stored in activities.parts safely. */
export function readParts(raw: unknown): TestPart[] {
  return Array.isArray(raw) ? (raw as TestPart[]).filter((p) => p && typeof p === "object" && "type" in p) : [];
}

/** One-line summary, e.g. "True / False · 10 items · 10 pts". */
export function partSummary(p: TestPart) {
  const pts = partTotal(p);
  if (p.type === "essay") return `Essay · ${p.questions.length} question${p.questions.length === 1 ? "" : "s"} · ${pts} pts`;
  return `${partTypeLabel(p.type)} · ${p.items} item${p.items === 1 ? "" : "s"} · ${pts} pt${pts === 1 ? "" : "s"}`;
}
