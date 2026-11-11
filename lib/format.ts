const pad = (n: number) => String(n).padStart(2, "0");

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date";

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export const isOverdue = (iso?: string | null) => !!iso && new Date(iso).getTime() < Date.now();

/** ISO → "YYYY-MM-DD" in local time, for <input type="date"> */
export const toDateInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** "YYYY-MM-DD" → ISO at 11:59 PM local time (due end of day) */
export const fromDateInput = (v: string) => (v ? new Date(`${v}T23:59:00`).toISOString() : null);

/** "Maria Santos" → "maria.santos" */
export const suggestUsername = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 32);

/** "08:30:00" → "8:30 AM" */
export const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

/** "08:30:00" → minutes since midnight */
export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Today as 1 (Mon) … 7 (Sun) */
export const todayWeekday = () => ((new Date().getDay() + 6) % 7) + 1;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Date (day of month) of a weekday in the current week. */
export const dateOfWeekday = (weekday: number) => {
  const d = new Date();
  d.setDate(d.getDate() + (weekday - todayWeekday()));
  return d.getDate();
};

/** "YYYY-MM-DD" → "Nov 13, 2026" */
export const fmtDay = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date";

/** Monday 00:00 (local) of the current week. */
export function startOfWeek() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
