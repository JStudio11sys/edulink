// Sample data — will be replaced by Supabase later.

export type Status = "todo" | "progress" | "done";

export interface Task {
  id: string;
  title: string;
  subject: string;
  due: string;
  comments: number;
  status: Status;
  progress: number;
  description: string;
}

export type NoteColor = "mint" | "lilac" | "peach" | "sky";

export interface Note {
  id: string;
  title: string;
  body: string;
  date: string;
  color: NoteColor;
}

export interface Lesson {
  id: string;
  start: number; // minutes from midnight
  end: number;
  subject: string;
  teacher: string;
  building: string;
  room: string;
}

export interface Day {
  key: string;
  short: string;
  long: string;
  date: number;
}

export const STUDENT = { name: "Kate Malone", first: "Kate", className: "Class 9A" };

export const SUBJECTS = [
  "English Literature",
  "Math",
  "Biology",
  "Social Studies",
  "Computer Science",
  "Art",
];

export const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Read poem & answer questions",
    subject: "English Literature",
    due: "Nov 13, 2026",
    comments: 12,
    status: "progress",
    progress: 35,
    description:
      "Read the poem on page 42 and answer questions 1–6. Focus on imagery and the central metaphor.",
  },
  {
    id: "t2",
    title: "Create a comic strip with a story",
    subject: "Social Studies",
    due: "Nov 16, 2026",
    comments: 2,
    status: "todo",
    progress: 0,
    description: "Six-panel comic about a historical event of your choice. Add a short caption to each panel.",
  },
  {
    id: "t3",
    title: "Prepare for the math test",
    subject: "Math",
    due: "Nov 18, 2026",
    comments: 0,
    status: "todo",
    progress: 0,
    description: "Review chapters 4–5: linear and quadratic equations. Practice set B is recommended.",
  },
  {
    id: "t4",
    title: "Lab report: onion skin cells",
    subject: "Biology",
    due: "Nov 19, 2026",
    comments: 5,
    status: "progress",
    progress: 70,
    description: "Write up the microscope lab. Include a labelled drawing and your conclusions.",
  },
  {
    id: "t5",
    title: "Read the chapter about plant and animal cells",
    subject: "Biology",
    due: "Nov 20, 2026",
    comments: 0,
    status: "todo",
    progress: 0,
    description: "Chapter 7. Make a short comparison table of plant vs animal cells.",
  },
  {
    id: "t6",
    title: "Build a simple calculator",
    subject: "Computer Science",
    due: "Nov 9, 2026",
    comments: 8,
    status: "done",
    progress: 100,
    description: "A calculator that supports + − × ÷ and handles division by zero.",
  },
];

export const initialNotes: Note[] = [
  {
    id: "n1",
    title: "Math concept",
    body: "A linear equation is an equation of the form ax + b = c, where a, b and c are constants and x is the variable.",
    date: "Nov 10, 2026",
    color: "mint",
  },
  {
    id: "n2",
    title: "Biology concept",
    body: "A cell is the basic structural, functional and biological unit of all living organisms — the smallest unit capable of performing life functions.",
    date: "Nov 8, 2026",
    color: "lilac",
  },
  {
    id: "n3",
    title: "History dates",
    body: "1066 — Battle of Hastings. 1492 — Columbus reaches the Americas. 1789 — French Revolution begins.",
    date: "Nov 5, 2026",
    color: "peach",
  },
  {
    id: "n4",
    title: "Reading list",
    body: "To Kill a Mockingbird, Animal Farm, The Giver, Wonder.",
    date: "Nov 2, 2026",
    color: "sky",
  },
];

export const DAYS: Day[] = [
  { key: "mon", short: "Mon", long: "Monday", date: 9 },
  { key: "tue", short: "Tue", long: "Tuesday", date: 10 },
  { key: "wed", short: "Wed", long: "Wednesday", date: 11 },
  { key: "thu", short: "Thu", long: "Thursday", date: 12 },
  { key: "fri", short: "Fri", long: "Friday", date: 13 },
];

export const TODAY = "wed";
export const DEMO_NOW = 10 * 60 + 40; // pretend it's 10:40 AM

const L = (
  id: string,
  sh: number,
  sm: number,
  mins: number,
  subject: string,
  teacher: string,
  building: string,
  room: string,
): Lesson => ({ id, start: sh * 60 + sm, end: sh * 60 + sm + mins, subject, teacher, building, room });

export const SCHEDULE: Record<string, Lesson[]> = {
  mon: [
    L("m1", 8, 30, 45, "Math", "Mrs. Goodman", "B3", "Room 124"),
    L("m2", 9, 30, 45, "Biology", "Mr. Yudge", "B2", "Room 210"),
    L("m3", 10, 30, 45, "Art", "Ms. Rivera", "B1", "Studio 2"),
    L("m4", 12, 15, 45, "English Literature", "Mrs. Melton", "B2", "Room 158"),
  ],
  tue: [
    L("tu1", 8, 30, 90, "Social Studies", "Mrs. Goodman", "B3", "Room 124"),
    L("tu2", 10, 30, 90, "English Literature", "Mrs. Melton", "B2", "Room 158"),
    L("tu3", 12, 15, 90, "Computer Science", "Mr. Hodge", "B3", "Room 310"),
  ],
  wed: [
    L("w1", 8, 0, 45, "Math", "Mrs. Goodman", "B3", "Room 124"),
    L("w2", 9, 0, 45, "Social Studies", "Mrs. Goodman", "B3", "Room 124"),
    L("w3", 10, 30, 45, "English Literature", "Mrs. Melton", "B2", "Room 158"),
    L("w4", 12, 15, 45, "Computer Science", "Mr. Hodge", "B3", "Room 310"),
    L("w5", 14, 0, 45, "Biology", "Mr. Yudge", "B2", "Room 210"),
  ],
  thu: [
    L("th1", 9, 0, 45, "Biology", "Mr. Yudge", "B2", "Room 210"),
    L("th2", 10, 0, 45, "Math", "Mrs. Goodman", "B3", "Room 124"),
    L("th3", 12, 0, 45, "Art", "Ms. Rivera", "B1", "Studio 2"),
  ],
  fri: [
    L("f1", 8, 30, 45, "Computer Science", "Mr. Hodge", "B3", "Room 310"),
    L("f2", 10, 0, 45, "Social Studies", "Mrs. Goodman", "B3", "Room 124"),
    L("f3", 11, 0, 45, "English Literature", "Mrs. Melton", "B2", "Room 158"),
    L("f4", 13, 0, 45, "Math", "Mrs. Goodman", "B3", "Room 124"),
  ],
};

export function formatTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function lessonState(dayKey: string, l: Lesson): "past" | "now" | "next" {
  if (dayKey !== TODAY) return "next";
  if (DEMO_NOW >= l.end) return "past";
  if (DEMO_NOW >= l.start) return "now";
  return "next";
}

export const NOTIFICATIONS = [
  { id: "x1", title: "Mrs. Melton commented", body: "Nice start on the poem questions!", time: "5m" },
  { id: "x2", title: "Math test moved", body: "Now on Wednesday, Nov 18.", time: "1h" },
  { id: "x3", title: "New activity", body: "Art Exhibition sign-ups are open.", time: "3h" },
];

export const ACTIVITIES = [
  { id: "a1", title: "Math Olympiad", date: "Nov 28, 2026", desc: "Conducted for classes 8–9", color: "mint" as const },
  { id: "a2", title: "Art Exhibition", date: "Dec 3, 2026", desc: "Exhibition of creative works", color: "lilac" as const },
  { id: "a3", title: "Science Fair", date: "Dec 12, 2026", desc: "Present your own experiment", color: "peach" as const },
];

export const ACHIEVEMENTS = [
  { id: "b1", title: "Top of class", desc: "Math · Term 1", color: "peach" as const },
  { id: "b2", title: "Reading streak", desc: "30 days", color: "mint" as const },
  { id: "b3", title: "Science fair", desc: "2nd place", color: "lilac" as const },
  { id: "b4", title: "Perfect attendance", desc: "October", color: "sky" as const },
];
