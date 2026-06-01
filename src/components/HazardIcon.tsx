import type { HazardLayerId } from "@/types/land";

type Props = {
  id: HazardLayerId;
  className?: string;
};

/** ハザード種別ごとのシンプルなラインアイコン（currentColor で色付く） */
export function HazardIcon({ id, className }: Props) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (id) {
    case "flood":
      return (
        <svg {...common}>
          <path d="M2 9c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
          <path d="M2 14c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
          <path d="M2 19c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
        </svg>
      );
    case "floodKeizoku":
      return (
        <svg {...common}>
          <path d="M2 17c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" />
          <path d="M2 21c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" />
          <circle cx="12" cy="8" r="5" />
          <path d="M12 5.5V8l1.8 1.2" />
        </svg>
      );
    case "kaokuHanran":
      return (
        <svg {...common}>
          <path d="M4 11l8-6 8 6" />
          <path d="M6 10v6m12-6v6" />
          <path d="M2 20c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" />
        </svg>
      );
    case "tsunami":
      return (
        <svg {...common}>
          <path d="M3 20c3 0 3-2 6-2s3 2 6 2 3-2 6-2" />
          <path d="M4 16c0-5 3-9 8-9 4 0 6 3 6 6 0 2-1.5 3.5-3.5 3.5S11 15 11 13c0-1.2.9-2 2-2" />
        </svg>
      );
    case "hightide":
      return (
        <svg {...common}>
          <path d="M2 18c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
          <path d="M2 22c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" />
          <path d="M12 13V3m0 0l-3 3m3-3l3 3" />
        </svg>
      );
    case "debrisFlow":
      return (
        <svg {...common}>
          <path d="M3 19l6-11 4 6 3-4 5 9z" />
          <circle cx="9" cy="16" r="0.6" fill="currentColor" />
          <circle cx="13" cy="18" r="0.6" fill="currentColor" />
          <circle cx="16" cy="16" r="0.6" fill="currentColor" />
        </svg>
      );
    case "steepSlope":
      return (
        <svg {...common}>
          <path d="M4 20h16L4 6z" />
          <path d="M13 12l4 4m0 0v-3m0 3h-3" />
        </svg>
      );
    case "landslide":
      return (
        <svg {...common}>
          <path d="M3 18c4-1 6-7 10-7 3 0 5 2 8 2" />
          <path d="M3 21c4-1 6-5 10-5 3 0 5 1 8 1" />
          <path d="M11 6l2 3m2-5l1.5 3" />
        </svg>
      );
  }
}
