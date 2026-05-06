"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getEncyclopediaItems } from "@/lib/actions/inventory";

type EncyclopediaItem = {
  id: string;
  name: string;
  category: string;
  metadata: Record<string, unknown>;
};

type Tab = "NURUK" | "HOP" | "YEAST" | "GRAIN";

const TABS: { value: Tab; label: string }[] = [
  { value: "NURUK", label: "누룩" },
  { value: "HOP", label: "홉" },
  { value: "YEAST", label: "효모" },
  { value: "GRAIN", label: "곡물" },
];

function str(v: unknown): string {
  return String(v ?? "");
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-brew-bg border border-brew-border text-brew-muted">
      {label}
    </span>
  );
}

function StatPill({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-brew-bg border border-brew-border px-3 py-2 min-w-0">
      <span className="text-[10px] text-brew-subtle mb-0.5 whitespace-nowrap">{label}</span>
      <span className="font-mono text-sm font-semibold text-brew-text">
        {value}{unit && <span className="text-xs font-normal text-brew-muted ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

function HopCard({ item }: { item: EncyclopediaItem }) {
  const m = item.metadata;
  const USAGE: Record<string, string> = { bittering: "쓴맛", aroma: "아로마", dual: "듀얼" };
  return (
    <div className="rounded-xl border border-brew-border bg-brew-surface p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif font-semibold text-brew-text">{item.name}</h3>
        <span className="shrink-0 text-xs rounded-full border border-green-200 bg-green-50 text-green-800 px-2 py-0.5">홉</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {m.alphaAcid != null && <StatPill label="알파산 (α)" value={str(m.alphaAcid)} unit="%" />}
        {m.betaAcid != null && <StatPill label="베타산 (β)" value={str(m.betaAcid)} unit="%" />}
        {m.origin != null && <StatPill label="원산지" value={str(m.origin)} />}
        {m.usage != null && <StatPill label="용도" value={USAGE[str(m.usage)] ?? str(m.usage)} />}
      </div>
      {Array.isArray(m.aromaProfile) && m.aromaProfile.length > 0 && (
        <div>
          <p className="text-[10px] text-brew-subtle mb-1.5">향 프로파일</p>
          <div className="flex flex-wrap gap-1">
            {(m.aromaProfile as string[]).map((t) => <Tag key={t} label={t} />)}
          </div>
        </div>
      )}
      {m.description != null && (
        <p className="text-xs text-brew-muted leading-relaxed border-t border-brew-border pt-3">{str(m.description)}</p>
      )}
    </div>
  );
}

function NurukCard({ item }: { item: EncyclopediaItem }) {
  const m = item.metadata;
  return (
    <div className="rounded-xl border border-brew-border bg-brew-surface p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif font-semibold text-brew-text">{item.name}</h3>
        <span className="shrink-0 text-xs rounded-full border border-orange-200 bg-orange-50 text-orange-800 px-2 py-0.5">누룩</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {m.nurukType != null && <StatPill label="종류" value={str(m.nurukType)} />}
        {m.saccharification != null && <StatPill label="당화력" value={str(m.saccharification)} />}
        {m.recommendedRatio != null && <StatPill label="권장 비율" value={str(m.recommendedRatio)} unit="%" />}
        {m.fermentTemp != null && <StatPill label="발효 온도" value={str(m.fermentTemp)} unit="°C" />}
      </div>
      {Array.isArray(m.flavor) && m.flavor.length > 0 && (
        <div>
          <p className="text-[10px] text-brew-subtle mb-1.5">풍미</p>
          <div className="flex flex-wrap gap-1">
            {(m.flavor as string[]).map((t) => <Tag key={t} label={t} />)}
          </div>
        </div>
      )}
      {m.description != null && (
        <p className="text-xs text-brew-muted leading-relaxed border-t border-brew-border pt-3">{str(m.description)}</p>
      )}
    </div>
  );
}

function YeastCard({ item }: { item: EncyclopediaItem }) {
  const m = item.metadata;
  return (
    <div className="rounded-xl border border-brew-border bg-brew-surface p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif font-semibold text-brew-text">{item.name}</h3>
        <span className="shrink-0 text-xs rounded-full border border-yellow-200 bg-yellow-50 text-yellow-800 px-2 py-0.5">효모</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {m.strain != null && <StatPill label="균주명" value={str(m.strain)} />}
        {m.type != null && <StatPill label="타입" value={str(m.type)} />}
        {m.attenuation != null && <StatPill label="발효도" value={str(m.attenuation)} unit="%" />}
        {m.tempRange != null && <StatPill label="적정 온도" value={str(m.tempRange)} unit="°C" />}
        {m.flocculation != null && <StatPill label="응집도" value={str(m.flocculation)} />}
      </div>
      {m.origin != null && (
        <p className="text-xs text-brew-subtle">제조사: {str(m.origin)}</p>
      )}
      {m.description != null && (
        <p className="text-xs text-brew-muted leading-relaxed border-t border-brew-border pt-3">{str(m.description)}</p>
      )}
    </div>
  );
}

function GrainCard({ item }: { item: EncyclopediaItem }) {
  const m = item.metadata;
  const isRice = item.category === "RICE";
  const isOther = item.category === "OTHER";
  const badge = isRice
    ? { cls: "border-lime-200 bg-lime-50 text-lime-800", label: "쌀" }
    : isOther
    ? { cls: "border-purple-200 bg-purple-50 text-purple-800", label: "보조곡물" }
    : { cls: "border-amber-200 bg-amber-50 text-amber-800", label: "몰트" };
  return (
    <div className="rounded-xl border border-brew-border bg-brew-surface p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif font-semibold text-brew-text">{item.name}</h3>
        <span className={`shrink-0 text-xs rounded-full border px-2 py-0.5 ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      {m.description != null && (
        <p className="text-xs text-brew-muted leading-relaxed">{str(m.description)}</p>
      )}
      {Array.isArray(m.recommendedUse) && m.recommendedUse.length > 0 && (
        <div>
          <p className="text-[10px] text-brew-subtle mb-1.5">추천 용도</p>
          <div className="flex flex-wrap gap-1">
            {(m.recommendedUse as string[]).map((t) => <Tag key={t} label={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function TabContent({ items, tab }: { items: EncyclopediaItem[]; tab: Tab }) {
  const filtered = items.filter((i) =>
    tab === "GRAIN"
      ? i.category === "GRAIN" || i.category === "RICE" || i.category === "OTHER"
      : i.category === tab
  );

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-brew-subtle text-sm">등록된 항목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((item) => {
        if (tab === "HOP") return <HopCard key={item.id} item={item} />;
        if (tab === "NURUK") return <NurukCard key={item.id} item={item} />;
        if (tab === "YEAST") return <YeastCard key={item.id} item={item} />;
        return <GrainCard key={item.id} item={item} />;
      })}
    </div>
  );
}

export default function EncyclopediaButton() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("NURUK");
  const [items, setItems] = useState<EncyclopediaItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const openModal = useCallback(async () => {
    setOpen(true);
    if (items === null && !loading) {
      setLoading(true);
      const data = await getEncyclopediaItems();
      setItems(data as EncyclopediaItem[]);
      setLoading(false);
    }
  }, [items, loading]);

  const closeModal = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeModal]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={openModal}
        className="rounded-xl border border-brew-border px-4 py-2 text-sm font-medium text-brew-muted hover:border-brew-border-hover hover:text-brew-text transition-colors"
      >
        📖 도감
      </button>

      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8"
          onMouseDown={(e) => { if (e.target === overlayRef.current) closeModal(); }}
        >
          <div className="relative flex flex-col w-full max-w-5xl bg-brew-bg rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-brew-border shrink-0">
              <h2 className="font-serif text-xl font-bold text-brew-text">양조 재료 도감</h2>
              <button
                onClick={closeModal}
                className="text-brew-muted hover:text-brew-text transition-colors text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-brew-surface"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-5 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.value
                      ? "border-brew-accent text-brew-text bg-brew-surface"
                      : "border-transparent text-brew-muted hover:text-brew-text"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-brew-subtle text-sm">불러오는 중...</p>
                </div>
              ) : items !== null ? (
                <TabContent items={items} tab={activeTab} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
