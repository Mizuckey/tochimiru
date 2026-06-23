import type {
  MapDataMode,
  MarketTransaction,
} from "@/types/market-transaction";
import {
  priceClassificationLabel,
  transactionMapLabel,
} from "@/lib/market-transactions-repository";
import { inferredElementarySchoolsFromPlace } from "@/lib/elementary-school-districts";
import { resolveIsuzuJuniorHighSchool } from "@/lib/isuzu-junior-high-district";

type Props = {
  transaction: MarketTransaction | null;
  locationTransactions: MarketTransaction[];
  onSelectTransaction: (transaction: MarketTransaction) => void;
  dataMode: MapDataMode;
  onClose: () => void;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-800">{children}</dd>
    </div>
  );
}

function formatYen(value: number | null): string {
  if (value == null) return "—";
  return `${value.toLocaleString()} 円`;
}

function DetailBody({ transaction }: { transaction: MarketTransaction }) {
  const classification = priceClassificationLabel(
    transaction.priceClassification,
  );
  const location = [
    transaction.prefecture,
    transaction.municipality,
    transaction.districtName,
  ]
    .filter(Boolean)
    .join("");
  const elementarySchools = inferredElementarySchoolsFromPlace(location);
  const juniorHigh = resolveIsuzuJuniorHighSchool(location);

  return (
    <>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-zinc-500">取引価格</dt>
          <dd className="text-xl font-semibold text-emerald-700">
            {formatYen(transaction.tradePriceYen)}
          </dd>
        </div>

        {transaction.unitPriceYenPerSqm != null && (
          <Row label="㎡単価">
            {transaction.unitPriceYenPerSqm.toLocaleString()} 円/㎡
          </Row>
        )}

        {transaction.areaSqm != null && (
          <Row label="土地面積">
            {transaction.areaSqm.toLocaleString()} ㎡
          </Row>
        )}

        <Row label="取引時期">
          {transaction.period ??
            `${transaction.year}年 第${transaction.quarter}四半期`}
        </Row>

        {classification && <Row label="価格区分">{classification}</Row>}

        {transaction.type && <Row label="種類">{transaction.type}</Row>}

        {location && <Row label="所在地">{location}</Row>}

        {elementarySchools.length > 0 && (
          <Row label="小学校区（目安）">
            {elementarySchools.join("・")}
            <span className="ml-1 text-xs text-zinc-400">（町名リストより）</span>
          </Row>
        )}

        {juniorHigh && (
          <Row label="中学校区（目安）">
            {juniorHigh}
            <span className="ml-1 text-xs text-zinc-400">（町名リストより）</span>
          </Row>
        )}

        {transaction.nearestStation && (
          <Row label="最寄り駅">
            {transaction.nearestStation}
            {transaction.distanceToNearestStation && (
              <span className="ml-1 text-xs text-zinc-400">
                （{transaction.distanceToNearestStation}）
              </span>
            )}
          </Row>
        )}

        {transaction.landShape && (
          <Row label="土地の形状">{transaction.landShape}</Row>
        )}

        {transaction.frontage && <Row label="間口">{transaction.frontage}</Row>}

        {transaction.totalFloorAreaSqm != null && (
          <Row label="延床面積">
            {transaction.totalFloorAreaSqm.toLocaleString()} ㎡
          </Row>
        )}

        {transaction.buildingYear && (
          <Row label="建築年">{transaction.buildingYear}</Row>
        )}

        {transaction.structure && (
          <Row label="構造">{transaction.structure}</Row>
        )}

        {transaction.use && <Row label="用途">{transaction.use}</Row>}

        {transaction.purpose && (
          <Row label="将来利用目的">{transaction.purpose}</Row>
        )}

        {transaction.remarks && <Row label="備考">{transaction.remarks}</Row>}
      </dl>

      <p className="mt-4 text-xs text-zinc-400">
        出典:{" "}
        <a
          href="https://www.reinfolib.mlit.go.jp/"
          target="_blank"
          rel="noreferrer"
          className="text-sky-700 underline-offset-2 hover:underline"
        >
          不動産情報ライブラリ
        </a>
        （国土交通省）。位置は町丁目名からの代表点であり、個別物件の位置ではありません。
      </p>
    </>
  );
}

function LocationTransactionPicker({
  transactions,
  selectedId,
  onSelect,
}: {
  transactions: MarketTransaction[];
  selectedId: string;
  onSelect: (transaction: MarketTransaction) => void;
}) {
  if (transactions.length <= 1) {
    return null;
  }

  return (
    <div className="mb-4 border-b border-zinc-100 pb-4">
      <p className="mb-2 text-xs font-medium text-zinc-500">
        この地点の取引 {transactions.length} 件
      </p>
      <ul className="max-h-40 space-y-1 overflow-y-auto overscroll-contain">
        {transactions.map((item) => {
          const selected = item.id === selectedId;
          const price =
            item.tradePriceYen != null
              ? `${item.tradePriceYen.toLocaleString()} 円`
              : "価格不明";
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selected
                    ? "border-emerald-600 bg-emerald-50 text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <span className="block font-medium leading-snug">
                  {transactionMapLabel(item)}
                </span>
                <span className="mt-0.5 block text-xs text-emerald-700">
                  {price}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MarketTransactionDetailPanel({
  transaction,
  locationTransactions,
  onSelectTransaction,
  dataMode,
  onClose,
}: Props) {
  if (dataMode !== "reinfolib") {
    return null;
  }

  if (!transaction) {
    return (
      <aside className="hidden w-72 shrink-0 flex-col border-l border-zinc-200 bg-white p-4 xl:w-80 lg:flex">
        <h2 className="text-lg font-semibold text-zinc-900">取引事例</h2>
        <p className="mt-2 text-sm text-zinc-600">
          地図のピンをクリックすると、不動産情報ライブラリの取引情報が表示されます。
        </p>
        <p className="mt-4 text-xs text-zinc-400">
          データが無い場合は import:isuzugawa-prices を実行し、マイグレーション
          0006 でジオコード列を追加してください。
        </p>
      </aside>
    );
  }

  const title = transactionMapLabel(transaction);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-20 bg-black/35 lg:hidden"
        aria-label="詳細を閉じる"
        onClick={onClose}
      />

      <aside
        className="fixed inset-x-0 bottom-0 z-30 flex max-h-[min(58vh,28rem)] flex-col overflow-hidden rounded-t-2xl border-t border-zinc-200 bg-white shadow-2xl lg:static lg:z-auto lg:max-h-none lg:w-72 lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none xl:w-80"
        role="dialog"
        aria-modal="true"
        aria-label="取引事例の詳細"
      >
        <div className="shrink-0 border-b border-zinc-100 px-4 pb-2 pt-3 lg:border-0 lg:pt-4">
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 lg:hidden"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 min-h-11 min-w-11 rounded-lg text-lg text-zinc-500 hover:bg-zinc-100 lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1 lg:text-sm"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 lg:pb-4">
          <LocationTransactionPicker
            transactions={locationTransactions}
            selectedId={transaction.id}
            onSelect={onSelectTransaction}
          />
          <DetailBody transaction={transaction} />
        </div>
      </aside>
    </>
  );
}
