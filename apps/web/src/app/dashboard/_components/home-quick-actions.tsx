"use client";

import { useState } from "react";
import Link from "next/link";
import type { ActiveBatchSummary } from "@/lib/actions/dashboard";
import BatchPickerModal, { type BatchPickerMode } from "./batch-picker-modal";

type Tone = "cream" | "green" | "neutral";

type LinkAction = {
  kind: "link";
  href: string;
  label: string;
  tone: Tone;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

type ModalAction = {
  kind: "modal";
  mode: BatchPickerMode;
  label: string;
  tone: Tone;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

type Action = LinkAction | ModalAction;

const IconPlus = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const IconBook = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const IconThermo = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
);

const IconCamera = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ACTIONS: Action[] = [
  { kind: "link", href: "/dashboard/batches/new", label: "새 배치", tone: "cream", icon: IconPlus },
  { kind: "link", href: "/dashboard/recipes/new", label: "새 레시피", tone: "green", icon: IconBook },
  { kind: "modal", mode: "measure", label: "간편 측정", tone: "neutral", icon: IconThermo },
  { kind: "modal", mode: "photos", label: "사진 기록", tone: "neutral", icon: IconCamera, adminOnly: true },
];

function toneClass(tone: Tone): string {
  switch (tone) {
    case "cream":
      return "bg-brew-cream text-brew-cream-ink hover:brightness-95";
    case "green":
      return "bg-brew-success text-brew-text-light hover:bg-[#2A6038]";
    case "neutral":
    default:
      return "bg-brew-surface-dark text-brew-text hover:bg-brew-border-hover";
  }
}

const ITEM_CLASS =
  "rounded-xl flex flex-col items-center justify-center gap-1.5 py-3 md:py-4 px-2 border border-brew-border/40 shadow-sm transition-all hover:-translate-y-0.5";

type Props = {
  isAdmin: boolean;
  activeBatches: ActiveBatchSummary[];
};

export default function HomeQuickActions({ isAdmin, activeBatches }: Props) {
  const visible = ACTIONS.filter((a) => !a.adminOnly || isAdmin);
  const cols = visible.length === 4 ? "grid-cols-4" : "grid-cols-3";
  const [modalMode, setModalMode] = useState<BatchPickerMode | null>(null);

  return (
    <>
      <section className={`grid ${cols} gap-2 md:gap-3`}>
        {visible.map((a) =>
          a.kind === "link" ? (
            <Link
              key={a.label}
              href={a.href}
              className={`${toneClass(a.tone)} ${ITEM_CLASS}`}
            >
              <span aria-hidden="true">{a.icon}</span>
              <span className="text-xs font-medium leading-none md:text-sm">{a.label}</span>
            </Link>
          ) : (
            <button
              key={a.label}
              type="button"
              onClick={() => setModalMode(a.mode)}
              className={`${toneClass(a.tone)} ${ITEM_CLASS}`}
            >
              <span aria-hidden="true">{a.icon}</span>
              <span className="text-xs font-medium leading-none md:text-sm">{a.label}</span>
            </button>
          ),
        )}
      </section>

      {modalMode && (
        <BatchPickerModal
          mode={modalMode}
          batches={activeBatches}
          onClose={() => setModalMode(null)}
        />
      )}
    </>
  );
}
