"use client";

import type { ReactNode } from "react";
import type { HazardLayerId } from "@/types/land";
import { MapColorLegend } from "@/components/MapColorLegend";
import { HazardLayerToggle } from "@/components/HazardLayerToggle";
import { SchoolDistrictHighlightControl } from "@/components/SchoolDistrictHighlightControl";

type Props = {
  activeHazards: Set<HazardLayerId>;
  onToggleHazard: (layerId: HazardLayerId) => void;
  highlightShujuuDistrict: boolean;
  onToggleShujuuDistrict: () => void;
  highlightShuudouDistrict: boolean;
  onToggleShuudouDistrict: () => void;
  highlightIsuzuDistrict: boolean;
  onToggleIsuzuDistrict: () => void;
};

export function MapToolsPanel({
  activeHazards,
  onToggleHazard,
  highlightShujuuDistrict,
  onToggleShujuuDistrict,
  highlightShuudouDistrict,
  onToggleShuudouDistrict,
  highlightIsuzuDistrict,
  onToggleIsuzuDistrict,
}: Props) {
  const districtActiveCount = [
    highlightShujuuDistrict,
    highlightShuudouDistrict,
    highlightIsuzuDistrict,
  ].filter(Boolean).length;

  return (
    <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-md backdrop-blur sm:w-[17.5rem] sm:max-w-[17.5rem]">
      <div className="border-b border-zinc-100 px-3 py-2.5">
        <MapColorLegend embedded />
      </div>

      <CollapsibleSection
        title="ハザードマップ"
        badge={
          activeHazards.size > 0 ? String(activeHazards.size) : undefined
        }
      >
        <HazardLayerToggle
          embedded
          activeLayers={activeHazards}
          onToggle={onToggleHazard}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="校区の強調"
        badge={
          districtActiveCount > 0 ? String(districtActiveCount) : undefined
        }
      >
        <p className="mb-2 text-[11px] leading-snug text-zinc-500">
          町名リストに一致するピンのみ強調します（区域境界の塗りつぶしは未対応）。
        </p>
        <div className="flex flex-col gap-2">
          <SchoolDistrictHighlightControl
            compact
            accent="sky"
            label="進修小学校"
            active={highlightShujuuDistrict}
            onToggle={onToggleShujuuDistrict}
          />
          <SchoolDistrictHighlightControl
            compact
            accent="teal"
            label="修道小学校"
            active={highlightShuudouDistrict}
            onToggle={onToggleShuudouDistrict}
          />
          <SchoolDistrictHighlightControl
            compact
            accent="violet"
            label="五十鈴中学校"
            active={highlightIsuzuDistrict}
            onToggle={onToggleIsuzuDistrict}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <details className="group border-b border-zinc-100 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 transition-colors hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
        <Chevron className="size-3.5 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
        <span className="flex-1">{title}</span>
        {badge != null && (
          <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-white">
            {badge}
          </span>
        )}
      </summary>
      <div className="border-t border-zinc-100 px-3 pb-3 pt-2">{children}</div>
    </details>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
