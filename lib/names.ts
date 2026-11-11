import type { Profile } from "./types";

/** "Penduko, Pedro" when last/first names are known, otherwise the full name. */
export function displayName(p: Pick<Profile, "full_name" | "first_name" | "last_name">) {
  return capitalizeWords(p.last_name && p.first_name ? `${p.last_name}, ${p.first_name}` : p.full_name);
}

const SEX_ORDER = { female: 0, male: 1 } as const;
const sexRank = (p: Pick<Profile, "sex">) => (p.sex ? SEX_ORDER[p.sex] : 2);
const lastOf = (p: Profile) => (p.last_name ?? p.full_name.split(/\s+/).pop() ?? "").toLowerCase();
const firstOf = (p: Profile) => (p.first_name ?? p.full_name).toLowerCase();

/** Class-list order: girls first, then boys (then unknown), each by last name, then first name. */
export function compareStudents(a: Profile, b: Profile) {
  return sexRank(a) - sexRank(b) || lastOf(a).localeCompare(lastOf(b)) || firstOf(a).localeCompare(firstOf(b));
}

export const sortStudents = <T extends Profile>(list: T[]) => [...list].sort(compareStudents);

/** Split a sorted list into Girls / Boys / Not set groups (empty groups dropped). */
export function groupBySex<T extends Profile>(list: T[]) {
  const groups = [
    { key: "female", label: "Girls", items: list.filter((p) => p.sex === "female") },
    { key: "male", label: "Boys", items: list.filter((p) => p.sex === "male") },
    { key: "unset", label: "Not set", items: list.filter((p) => !p.sex) },
  ];
  return groups.filter((g) => g.items.length);
}

/** Capitalize the first letter of each word, leave the rest as typed ("dela cruz" → "Dela Cruz"). */
export const capitalizeWords = (s: string) => s.replace(/(^|[\s'-])(\p{Ll})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
