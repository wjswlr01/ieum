"use client";

import { useState } from "react";
import type { BreweryPhotoItem } from "@/lib/actions/brewery-photo";
import type { BreweryProductItem } from "@/lib/actions/brewery-product";
import type { BreweryDetail } from "@/lib/actions/brewery";
import BasicInfoTab from "./basic-info-tab";
import PhotosTab from "./photos-tab";
import ProductsTab from "./products-tab";
import HoursTab from "./hours-tab";
import PreviewTab from "./preview-tab";

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
  operatingHours: unknown;
  tourAvailable: boolean;
  tourBookingMethod: string | null;
  tourTimeInfo: string | null;
  tastingAvailable: boolean;
  tastingPriceInfo: string | null;
  tastingNote: string | null;
  parkingAvailable: boolean;
  parkingInfo: string | null;
  isPublished: boolean;
};

type TabKey = "basic" | "photos" | "products" | "hours" | "preview";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "basic", label: "기본 정보" },
  { key: "photos", label: "사진" },
  { key: "products", label: "제품" },
  { key: "hours", label: "운영 정보" },
  { key: "preview", label: "미리보기" },
];

export default function MyBreweryClient({
  brewery,
  photos,
  products,
  previewBrewery,
}: {
  brewery: MyBreweryData;
  photos: BreweryPhotoItem[];
  products: BreweryProductItem[];
  previewBrewery: BreweryDetail | null;
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
        <BasicInfoTab
          brewery={brewery}
          onSaved={showToast}
          onGoToPhotos={() => setTab("photos")}
        />
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
      ) : tab === "hours" ? (
        <HoursTab brewery={brewery} onSaved={showToast} />
      ) : (
        <PreviewTab
          breweryId={brewery.id}
          initialIsPublished={brewery.isPublished}
          previewBrewery={previewBrewery}
          onToast={showToast}
        />
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

