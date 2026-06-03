"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BrewType } from "@ieum/db";
import {
  deleteBreweryProduct,
  reorderBreweryProducts,
  type BreweryProductItem,
} from "@/lib/actions/brewery-product";
import ProductFormModal from "./product-form-modal";

const BREW_TYPE_LABEL: Record<BrewType, string> = {
  BEER: "맥주",
  MAKGEOLLI: "막걸리",
  CHEONGJU: "청주",
  SOJU: "증류주",
  FRUIT_WINE: "과실주",
};

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; product: BreweryProductItem }
  | null;

function formatPrice(price: number | null): string | null {
  if (price === null) return null;
  return `${price.toLocaleString("ko-KR")}원`;
}

function formatAbv(abv: number | null): string | null {
  if (abv === null) return null;
  return `${abv}%`;
}

export default function ProductsTab({
  breweryId,
  initialProducts,
  onToast,
}: {
  breweryId: string;
  initialProducts: BreweryProductItem[];
  onToast: (msg: string) => void;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<BreweryProductItem[]>(initialProducts);
  const [modal, setModal] = useState<ModalState>(null);
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...products].sort((a, b) => a.sortOrder - b.sortOrder),
    [products],
  );

  const refreshProducts = () => router.refresh();

  const handleAdded = (product: BreweryProductItem) => {
    setProducts((prev) => [...prev, product]);
    onToast("제품이 추가되었습니다");
    refreshProducts();
  };

  const handleUpdated = (product: BreweryProductItem) => {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
    onToast("제품이 수정되었습니다");
    refreshProducts();
  };

  const handleDelete = (product: BreweryProductItem) => {
    if (!window.confirm(`"${product.name}" 제품을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const res = await deleteBreweryProduct(product.id);
      if (!res.success) {
        onToast(res.error);
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      onToast("삭제되었습니다");
      refreshProducts();
    });
  };

  const persistOrder = (orderedIds: string[]) => {
    startTransition(async () => {
      const res = await reorderBreweryProducts(breweryId, orderedIds);
      if (!res.success) {
        onToast(res.error);
        refreshProducts();
        return;
      }
      refreshProducts();
    });
  };

  const reorderById = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const current = [...sorted];
    const sourceIdx = current.findIndex((p) => p.id === sourceId);
    const targetIdx = current.findIndex((p) => p.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;
    const moved = current[sourceIdx];
    if (!moved) return;
    current.splice(sourceIdx, 1);
    current.splice(targetIdx, 0, moved);
    const withOrder = current.map((p, idx) => ({ ...p, sortOrder: idx }));
    setProducts(withOrder);
    persistOrder(withOrder.map((p) => p.id));
  };

  const moveProduct = (productId: string, direction: "up" | "down") => {
    const idx = sorted.findIndex((p) => p.id === productId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const current = [...sorted];
    const a = current[idx];
    const b = current[targetIdx];
    if (!a || !b) return;
    current[idx] = b;
    current[targetIdx] = a;
    const withOrder = current.map((p, i) => ({ ...p, sortOrder: i }));
    setProducts(withOrder);
    persistOrder(withOrder.map((p) => p.id));
  };

  return (
    <div className="flex flex-col gap-6 pb-32">
      <section className="rounded-2xl border border-brew-border bg-brew-surface p-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-brew-text">제품 관리</h2>
            <p className="text-xs text-brew-muted">제품 {sorted.length}개 · 드래그하여 순서 변경</p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ mode: "create" })}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brew-accent px-3 py-2 text-sm font-semibold text-brew-dark hover:bg-brew-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            제품 추가
          </button>
        </header>

        {sorted.length === 0 ? (
          <EmptyState onAdd={() => setModal({ mode: "create" })} disabled={pending} />
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((product, idx) => (
              <ProductRow
                key={product.id}
                product={product}
                index={idx}
                total={sorted.length}
                disabled={pending}
                isDragging={dragId === product.id}
                isDragOver={overId === product.id && dragId !== product.id}
                onEdit={() => setModal({ mode: "edit", product })}
                onDelete={() => handleDelete(product)}
                onMoveUp={() => moveProduct(product.id, "up")}
                onMoveDown={() => moveProduct(product.id, "down")}
                onDragStart={() => setDragId(product.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDragOver={() => setOverId(product.id)}
                onDrop={() => {
                  if (dragId) reorderById(dragId, product.id);
                  setDragId(null);
                  setOverId(null);
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {modal?.mode === "create" && (
        <ProductFormModal
          mode="create"
          breweryId={breweryId}
          open
          onClose={() => setModal(null)}
          onSuccess={handleAdded}
        />
      )}
      {modal?.mode === "edit" && (
        <ProductFormModal
          mode="edit"
          breweryId={breweryId}
          product={modal.product}
          open
          onClose={() => setModal(null)}
          onSuccess={handleUpdated}
        />
      )}
    </div>
  );
}

function ProductRow({
  product,
  index,
  total,
  disabled,
  isDragging,
  isDragOver,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  product: BreweryProductItem;
  index: number;
  total: number;
  disabled: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}) {
  const abvText = formatAbv(product.alcoholContent);
  const priceText = formatPrice(product.price);
  const meta = [abvText, product.volume, priceText].filter(Boolean).join(" · ");

  return (
    <li
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", product.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`group flex items-center gap-3 rounded-xl border border-brew-border bg-white p-3 transition ${
        isDragging ? "opacity-40" : ""
      } ${isDragOver ? "ring-2 ring-brew-accent" : ""}`}
    >
      <span
        aria-hidden="true"
        className="hidden cursor-grab text-brew-muted md:flex md:h-8 md:w-4 md:items-center md:justify-center"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </span>

      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-brew-border bg-brew-bg">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brew-muted">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {product.brewType && (
            <span className="inline-flex items-center rounded-md bg-brew-accent-light px-2 py-0.5 text-[11px] font-semibold text-brew-accent-light-text">
              {BREW_TYPE_LABEL[product.brewType]}
            </span>
          )}
          <span className="truncate text-sm font-semibold text-brew-text">
            {product.name}
          </span>
        </div>
        {meta && <p className="text-xs text-brew-muted">{meta}</p>}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          aria-label="제품 수정"
          className="flex h-8 w-8 items-center justify-center rounded-md text-brew-muted hover:bg-brew-bg hover:text-brew-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          aria-label="제품 삭제"
          className="flex h-8 w-8 items-center justify-center rounded-md text-brew-muted hover:bg-red-50 hover:text-brew-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </button>

        {/* 모바일 ↑↓ */}
        <div className="ml-1 flex flex-col gap-0.5 md:hidden">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
            aria-label="앞으로 이동"
            className="flex h-5 w-7 items-center justify-center rounded-md bg-brew-bg text-brew-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={disabled || index === total - 1}
            aria-label="뒤로 이동"
            className="flex h-5 w-7 items-center justify-center rounded-md bg-brew-bg text-brew-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}

function EmptyState({
  onAdd,
  disabled,
}: {
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-brew-border bg-brew-bg px-6 py-12 text-center">
      <p className="text-sm text-brew-muted">등록된 제품이 없습니다.</p>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brew-accent px-3 py-2 text-sm font-semibold text-brew-dark hover:bg-brew-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
        첫 제품 추가하기
      </button>
    </div>
  );
}
