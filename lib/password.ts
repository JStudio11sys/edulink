// Easy-to-type passwords for students and teachers, e.g. "Tiger-maple-4821".
const WORDS = [
  "apple", "river", "tiger", "cloud", "maple", "comet", "otter", "lemon", "piano", "rocket",
  "sunny", "panda", "coral", "eagle", "mango", "pixel", "robin", "stone", "tulip", "violet",
  "willow", "zebra", "amber", "bison", "cedar", "delta", "ember", "falcon", "grape", "hazel",
  "koala", "lotus", "meadow", "nova", "olive", "pearl", "raven", "saturn", "thunder", "breeze",
];

export function generatePassword() {
  const r = new Uint32Array(3);
  crypto.getRandomValues(r);
  const a = WORDS[r[0] % WORDS.length];
  let b = WORDS[r[1] % WORDS.length];
  if (b === a) b = WORDS[(r[1] + 1) % WORDS.length];
  const n = 1000 + (r[2] % 9000);
  return `${a[0].toUpperCase()}${a.slice(1)}-${b}-${n}`;
}
