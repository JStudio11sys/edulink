/** EduLink mark: notebook + quill, with a woven link printed in the corner. Same artwork as app/icon.svg. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} role="img" aria-label="EduLink">
      <defs>
        <clipPath id="edulink-weave">
          <rect x="196" y="256" width="120" height="100" />
        </clipPath>
      </defs>
      <rect width="512" height="512" rx="128" fill="#16161A" />

      {/* Notebook */}
      <rect x="132" y="92" width="244" height="308" rx="34" fill="#A898F8" />
      <path d="M166 92 h18 v308 h-18 a34 34 0 0 1 -34 -34 v-240 a34 34 0 0 1 34 -34 z" fill="#6450E6" />
      <g fill="#16161A">
        <circle cx="158" cy="140" r="9" />
        <circle cx="158" cy="200" r="9" />
        <circle cx="158" cy="260" r="9" />
        <circle cx="158" cy="320" r="9" />
      </g>
      <g stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="12" strokeLinecap="round">
        <line x1="218" y1="150" x2="336" y2="150" />
        <line x1="218" y1="196" x2="320" y2="196" />
        <line x1="218" y1="242" x2="300" y2="242" />
      </g>

      {/* Quill */}
      <g transform="translate(150 430) rotate(-56)">
        <path
          d="M70 0 C 110 -26 150 -40 186 -46 L 176 -26 L 218 -52 C 280 -58 340 -42 380 -4 C 340 8 300 14 262 16 L 274 2 L 228 18 C 160 22 110 16 70 0 Z"
          fill="#B7EF9C"
          stroke="#16161A"
          strokeWidth="12"
          strokeLinejoin="round"
        />
        <path d="M60 0 Q 220 -6 360 -6" fill="none" stroke="#16161A" strokeWidth="8" strokeLinecap="round" />
        <path
          d="M0 0 L 40 -12 L 72 0 L 40 12 Z"
          fill="#FFFFFF"
          stroke="#16161A"
          strokeWidth="10"
          strokeLinejoin="round"
        />
      </g>

      {/* Woven link in the notebook corner */}
      <g transform="translate(326 348) scale(0.3) translate(-256 -256)">
        <g transform="rotate(-45 256 256)" fill="none" strokeWidth="48">
          <rect x="216" y="196" width="200" height="120" rx="60" stroke="#6450E6" />
          <rect x="96" y="196" width="200" height="120" rx="60" stroke="#B7EF9C" />
          <rect x="216" y="196" width="200" height="120" rx="60" stroke="#6450E6" clipPath="url(#edulink-weave)" />
        </g>
      </g>
    </svg>
  );
}
