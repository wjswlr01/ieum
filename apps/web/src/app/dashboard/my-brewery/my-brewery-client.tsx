"use client";

import { useState } from "react";
import type { BreweryPhotoItem } from "@/lib/actions/brewery-photo";
import type { BreweryProductItem } from "@/lib/actions/brewery-product";
import BasicInfoTab from "./basic-info-tab";
import PhotosTab from "./photos-tab";
import ProductsTab from "./products-tab";

export type MyBreweryData = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  address: string;
  region: string;
  city: string | null;
  website: string | null;
  businessNumber: string | null;
};

type TabKey = "basic" | "products" | "tour" | "tasting" | "photos";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "basic", label: "기본 정보" },
  { key: "products", label: "제품" },
  { key: "tour", label: "투어" },
  { key: "tasting", label: "시음" },
  { key: "photos", label: "사진" },
];

const PLACEHOLDER_PHASE: Record<Exclude<TabKey, "basic" | "photos" | "products">, string> = {
  tour: "Phase 5-B-4에서 구현 예정",
  tasting: "Phase 5-B-4에서 구현 예정",
};

export default function MyBreweryClient({
  brewery,
  photos,
  products,
}: {
  brewery: MyBreweryData;
  photos: BreweryPhotoItem[];
  products: BreweryProductItem[];
}) {
  const [tab, setTab] = useState<TabKey>("basic");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-3xl mx-auto w-full">
      <header className="mb-6 md:mb-8">
        <p className="text-xs font-medium text-brew-muted mb-1">양조장 관리</p>
        <h1 className="text-xl md:text-2xl font-bold text-brew-text">
          {brewery.name}
        </h1>
        {brewery.tagline && (
          <p className="mt-1 text-sm text-brew-muted">{brewery.tagline}</p>
        )}
      </header>

      <div className="mb-6 border-b border-brew-border">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  active
                    ? "text-brew-text border-brew-accent"
                    : "text-brew-muted border-transparent hover:text-brew-text"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "basic" ? (
        <BasicInfoTab brewery={brewery} onSaved={showToast} />
      ) : tab === "photos" ? (
        <PhotosTab
          breweryId={brewery.id}
          initialPhotos={photos}
          onToast={showToast}
        />
      ) : tab === "products" ? (
        <ProductsTab
          breweryId={brewery.id}
          initialProducts={products}
          onToast={showToast}
        />
      ) : (
        <PlaceholderTab message={PLACEHOLDER_PHASE[tab]} />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-brew-text px-4 py-3 text-sm font-medium text-brew-text-light shadow-lg md:bottom-10"
        >
          {toast}
        </div>
      )}
    </main>
  );
}

function PlaceholderTab({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brew-border bg-brew-surface px-6 py-12 text-center">
      <p className="text-sm text-brew-muted">{message}</p>
    </div>
  );
}
