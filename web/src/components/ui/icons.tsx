/** Hairline icons, 1.75 stroke, 20px grid. Kept in-house so weight matches the type. */
type P = React.SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 4v12M4 10h12" />
  </svg>
);
export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="m13.5 13.5 3 3" />
  </svg>
);
export const IconPlay = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M6 4.5v11l9-5.5-9-5.5Z" />
  </svg>
);
export const IconPause = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="5" y="4" width="3.5" height="12" rx="1" />
    <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
  </svg>
);
export const IconNext = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M5 4.5v11l7-5.5-7-5.5Z" />
    <rect x="13.5" y="4.5" width="2" height="11" rx="1" />
  </svg>
);
export const IconPrev = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M15 4.5v11l-7-5.5 7-5.5Z" />
    <rect x="4.5" y="4.5" width="2" height="11" rx="1" />
  </svg>
);
export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 5 10 10M15 5 5 15" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m4 10.5 4 4 8-9" />
  </svg>
);
export const IconArrowRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 10h12M11 5l5 5-5 5" />
  </svg>
);
export const IconArrowLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M16 10H4M9 5l-5 5 5 5" />
  </svg>
);
export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 8 5 5 5-5" />
  </svg>
);
export const IconExternal = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 4H4v12h12v-4M11 4h5v5M16 4l-7 7" />
  </svg>
);
export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6" />
  </svg>
);
export const IconSpeaker = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8v4h2.5L10 15V5L6.5 8H4ZM13 7.5a3.5 3.5 0 0 1 0 5M15 5a7 7 0 0 1 0 10" />
  </svg>
);
export const IconBell = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 13V9a4 4 0 0 1 8 0v4l1.5 2h-11L6 13ZM8.5 17a1.5 1.5 0 0 0 3 0" />
  </svg>
);
export const IconSpark = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 3v3M10 14v3M3 10h3M14 10h3M5.5 5.5l2 2M12.5 12.5l2 2M14.5 5.5l-2 2M7.5 12.5l-2 2" />
  </svg>
);
export const IconLogout = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 4H4v12h4M13 7l3 3-3 3M16 10H8" />
  </svg>
);
