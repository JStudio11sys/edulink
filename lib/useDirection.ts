import { useState } from "react";

/** Returns 1 when index increased since the last change, -1 when it decreased. */
export function useDirection(index: number) {
  const [s, setS] = useState({ index, dir: 1 });
  if (s.index !== index) {
    const next = { index, dir: index > s.index ? 1 : -1 };
    setS(next);
    return next.dir;
  }
  return s.dir;
}
