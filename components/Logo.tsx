import { useId } from "react";

/** EduLink mark: white open book on a teal → green → gold tile. Same artwork as app/icon.svg. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  const gid = `edulink-g-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} role="img" aria-label="EduLink">
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2FB3B0" />
          <stop offset="0.5" stopColor="#8CBF6C" />
          <stop offset="1" stopColor="#F0B429" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${gid})`} />
      <g fill="#FFFFFF">
        <path d="M100 168 L116 160 L116 352 L100 356 Z" />
        <path d="M412 168 L396 160 L396 352 L412 356 Z" />
        <path d="M247 156 C210 134 166 124 126 126 L126 342 C170 340 214 350 247 372 Z" />
        <path d="M265 156 C302 134 346 124 386 126 L386 342 C342 340 298 350 265 372 Z" />
      </g>
      <g fill="none" stroke="#FFFFFF" strokeWidth="13" strokeLinecap="round">
        <path d="M110 374 C162 362 214 370 248 396" />
        <path d="M402 374 C350 362 298 370 264 396" />
      </g>
    </svg>
  );
}
