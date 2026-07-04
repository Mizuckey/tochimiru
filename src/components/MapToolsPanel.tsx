"use client";

import type { ReactNode } from "react";
import type { HazardLayerId } from "@/types/land";
import { MapColorLegend } from "@/components/MapColorLegend";
import { HazardLayerToggle } from "@/components/HazardLayerToggle";
import { SchoolDistrictHighlightControl } from "@/components/SchoolDistrictHighlightControl";

type Props = {
  iseModeEnabled: boolean;
  activeHazards: Set<HazardLayerId>;
  onToggleHazard: (layerId: HazardLayerId) => void;
  surfaceSoilMeshVisible: boolean;
  surfaceSoilMeshLoading: boolean;
  surfaceSoilMeshLoadedCount: number;
  surfaceSoilMeshFailedCount: number;
  surfaceSoilMeshTargetCount: number;
  surfaceSoilMeshFetchableCount: number;
  surfaceSoilMeshFetchTotal: number;
  surfaceSoilMeshFetchedCount: number;
  surfaceSoilMeshCanFetch: boolean;
  surfaceSoilMeshMinZoom: number;
  currentZoom: number;
  onToggleSurfaceSoilMesh: () => void;
  onFetchSurfaceSoilMesh: () => void;
  highlightShujuuDistrict: boolean;
  onToggleShujuuDistrict: () => void;
  highlightShuudouDistrict: boolean;
  onToggleShuudouDistrict: () => void;
  highlightIsuzuDistrict: boolean;
  onToggleIsuzuDistrict: () => void;
};

export function MapToolsPanel({
  iseModeEnabled,
  activeHazards,
  onToggleHazard,
  surfaceSoilMeshVisible,
  surfaceSoilMeshLoading,
  surfaceSoilMeshLoadedCount,
  surfaceSoilMeshFailedCount,
  surfaceSoilMeshTargetCount,
  surfaceSoilMeshFetchableCount,
  surfaceSoilMeshFetchTotal,
  surfaceSoilMeshFetchedCount,
  surfaceSoilMeshCanFetch,
  surfaceSoilMeshMinZoom,
  currentZoom,
  onToggleSurfaceSoilMesh,
  onFetchSurfaceSoilMesh,
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
        title="地盤メッシュ"
        badge={surfaceSoilMeshVisible ? "ON" : undefined}
      >
        <button
          type="button"
          aria-pressed={surfaceSoilMeshVisible}
          onClick={onToggleSurfaceSoilMesh}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
            surfaceSoilMeshVisible
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold">250m地盤メッシュ</span>
            <span className="text-[11px] leading-snug opacity-75">
              表示中の範囲をボタンで取得
            </span>
          </span>
          <span
            className={`ml-3 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              surfaceSoilMeshVisible ? "bg-emerald-600" : "bg-zinc-300"
            }`}
            aria-hidden
          >
            <span
              className={`size-4 rounded-full bg-white shadow-sm transition-transform ${
                surfaceSoilMeshVisible ? "translate-x-4" : ""
              }`}
            />
          </span>
        </button>
        <div className="mt-2 rounded-lg bg-zinc-50 px-2.5 py-2 text-[11px] leading-snug text-zinc-600">
          <div className="flex items-center justify-between gap-2">
            <span>
              {surfaceSoilMeshLoading
                ? "J-SHIS 取得中"
                : surfaceSoilMeshLoadedCount > 0
                  ? "J-SHIS 取得済み"
                  : "J-SHIS 未取得"}
            </span>
            <span className="font-medium text-zinc-800">
              {surfaceSoilMeshLoadedCount}/{surfaceSoilMeshTargetCount}
            </span>
          </div>
          {surfaceSoilMeshFailedCount > 0 && (
            <p className="mt-1 text-red-600">
              取得失敗 {surfaceSoilMeshFailedCount} セル
            </p>
          )}
          <p className="mt-1 text-zinc-400">
            ズーム{surfaceSoilMeshMinZoom}
            以上で、現在見えている範囲の未取得セルを生成・取得できます。
          </p>
        </div>
        <button
          type="button"
          disabled={!surfaceSoilMeshCanFetch}
          onClick={onFetchSurfaceSoilMesh}
          className={`mt-2 flex min-h-10 w-full items-center justify-center rounded-lg px-3 text-xs font-semibold transition-colors ${
            surfaceSoilMeshCanFetch || surfaceSoilMeshLoading
              ? "bg-zinc-900 text-white hover:bg-zinc-700"
              : "bg-zinc-100 text-zinc-400"
          }`}
        >
          {surfaceSoilMeshLoading
            ? `取得中 ${surfaceSoilMeshFetchedCount}/${surfaceSoilMeshFetchTotal}`
            : surfaceSoilMeshFetchableCount > 0
              ? `表示中の地盤情報を取得（${surfaceSoilMeshFetchableCount}セル）`
              : currentZoom < surfaceSoilMeshMinZoom
                ? `ズーム${surfaceSoilMeshMinZoom}以上で取得`
                : "表示中の未取得セルはありません"}
        </button>
        <div className="mt-2 grid grid-cols-3 gap-1">
          <div className="min-w-0 text-center">
            <span className="mx-auto block h-2.5 rounded-sm border border-black/10 bg-zinc-300" />
            <span className="mt-1 block truncate text-[9px] text-zinc-500">
              未取得
            </span>
          </div>
          {[
            ["#d84b4b", "要注意"],
            ["#ee8a3b", "注意"],
            ["#e0c84f", "普通"],
            ["#72b95f", "良い"],
            ["#1d9a8a", "非常に良い"],
          ].map(([color, label]) => (
            <div key={label} className="min-w-0 text-center">
              <span
                className="mx-auto block h-2.5 rounded-sm border border-black/10"
                style={{ backgroundColor: color }}
              />
              <span className="mt-1 block truncate text-[9px] text-zinc-500">
                {label}
              </span>
            </div>
          ))}
        </div>
        <details className="mt-2 rounded-lg border border-zinc-200 bg-white">
          <summary className="cursor-pointer list-none px-2.5 py-2 text-[11px] font-semibold text-zinc-600 [&::-webkit-details-marker]:hidden">
            5段階判定の目安
          </summary>
          <div className="border-t border-zinc-100 px-2.5 py-2 text-[11px] leading-relaxed text-zinc-600">
            <p>
              この評価は J-SHIS 公式ランクではなく、トチミル内の目安です。
              AVS30、表層地盤増幅率、微地形区分を組み合わせています。
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>AVS30: 400m/s以上は+2、300m/s以上は+1、200m/s未満は-1、150m/s未満は-2</li>
              <li>増幅率: 1.3以下は+2、1.5以下は+1、1.8超は-1、2.1超は-2</li>
              <li>微地形: 山地・丘陵・台地系は+1、低地・湿地系は-1、旧河道・埋立・干拓系は-2</li>
            </ul>
            <p className="mt-1.5 text-zinc-400">
              合計値を1から5に正規化し、非常に良い/良い/普通/注意/要注意で表示します。
            </p>
          </div>
        </details>
      </CollapsibleSection>

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

      {iseModeEnabled && (
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
      )}
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
