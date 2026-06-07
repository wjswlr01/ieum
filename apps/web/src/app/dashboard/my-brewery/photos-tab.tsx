"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import {
  createBreweryPhotoUploadUrl,
  commitBreweryPhoto,
  abortBreweryPhotoUpload,
  deleteBreweryPhoto,
  setPrimaryBreweryPhoto,
  reorderBreweryPhotos,
  type BreweryPhotoItem,
} from "@/lib/actions/brewery-photo";

const COMPRESS_OPTS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  preserveExif: false,
};

const MAX_PHOTOS = 12;
const ACCEPT = "image/jpeg,image/png,image/heic,image/heif,image/webp";

export default function PhotosTab({
  breweryId,
  initialPhotos,
  onToast,
}: {
  breweryId: string;
  initialPhotos: BreweryPhotoItem[];
  onToast: (msg: string) => void;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<BreweryPhotoItem[]>(initialPhotos);
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sorted = useMemo(
    () => [...photos].sort((a, b) => a.sortOrder - b.sortOrder),
    [photos],
  );
  const emptySlotCount = Math.max(0, MAX_PHOTOS - sorted.length);
  const emptySlots = Array.from({ length: emptySlotCount });
  const isFull = sorted.length >= MAX_PHOTOS;

  const refreshPhotos = () => router.refresh();

  const triggerFilePicker = () => {
    if (isFull) {
      onToast(`최대 ${MAX_PHOTOS}장까지 업로드할 수 있습니다.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - sorted.length;
    const queue = Array.from(files).slice(0, remaining);
    if (queue.length === 0) return;

    startTransition(async () => {
      let uploaded = 0;
      for (const file of queue) {
        const ok = await uploadOne(file);
        if (!ok) break;
        uploaded += 1;
      }
      if (uploaded > 0) onToast("업로드되었습니다");
      refreshPhotos();
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 1) 압축 → 2) signed URL 발급 → 3) Supabase 직접 PUT → 4) DB commit
  const uploadOne = async (file: File): Promise<boolean> => {
    let compressed: File;
    try {
      compressed = await imageCompression(file, COMPRESS_OPTS);
    } catch (e) {
      console.error("[photos-tab] 압축 실패:", e);
      onToast("사진 압축에 실패했습니다.");
      return false;
    }

    const urlRes = await createBreweryPhotoUploadUrl(
      breweryId,
      file.name,
      compressed.type || "image/jpeg",
    );
    if (!urlRes?.success) {
      onToast(urlRes?.error ?? "업로드 URL 생성 실패");
      return false;
    }

    let putOk = false;
    try {
      const putRes = await fetch(urlRes.signedUrl, {
        method: "PUT",
        body: compressed,
        headers: { "Content-Type": compressed.type || "image/jpeg" },
      });
      putOk = putRes.ok;
    } catch (e) {
      console.error("[photos-tab] Storage PUT 실패:", e);
    }
    if (!putOk) {
      onToast("Storage 업로드에 실패했습니다.");
      return false;
    }

    const commitRes = await commitBreweryPhoto(breweryId, urlRes.path);
    if (!commitRes?.success) {
      // best-effort orphan 클린업
      await abortBreweryPhotoUpload(breweryId, urlRes.path).catch(() => {});
      onToast(commitRes?.error ?? "사진 저장에 실패했습니다.");
      return false;
    }

    setPhotos((prev) => [...prev, commitRes.photo]);
    return true;
  };

  const handleDelete = (photoId: string) => {
    if (!window.confirm("이 사진을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const res = await deleteBreweryPhoto(photoId);
      if (!res?.success) {
        onToast(res?.error ?? "삭제 중 오류가 발생했습니다.");
        return;
      }
      setPhotos((prev) => {
        const deleted = prev.find((p) => p.id === photoId);
        const next = prev.filter((p) => p.id !== photoId);
        if (deleted?.isPrimary && next.length > 0) {
          const promote = [...next].sort((a, b) => a.sortOrder - b.sortOrder)[0];
          if (!promote) return next;
          return next.map((p) =>
            p.id === promote.id ? { ...p, isPrimary: true } : p,
          );
        }
        return next;
      });
      onToast("삭제되었습니다");
      refreshPhotos();
    });
  };

  const handleSetPrimary = (photoId: string) => {
    startTransition(async () => {
      const res = await setPrimaryBreweryPhoto(photoId);
      if (!res?.success) {
        onToast(res?.error ?? "대표 사진 지정 중 오류가 발생했습니다.");
        return;
      }
      setPhotos((prev) =>
        prev.map((p) => ({ ...p, isPrimary: p.id === photoId })),
      );
      onToast("대표 사진이 변경되었습니다");
      refreshPhotos();
    });
  };

  const persistOrder = (orderedIds: string[]) => {
    startTransition(async () => {
      const res = await reorderBreweryPhotos(breweryId, orderedIds);
      if (!res?.success) {
        onToast(res?.error ?? "순서 변경 중 오류가 발생했습니다.");
        refreshPhotos();
        return;
      }
      refreshPhotos();
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
    setPhotos(withOrder);
    persistOrder(withOrder.map((p) => p.id));
  };

  const movePhoto = (photoId: string, direction: "up" | "down") => {
    const idx = sorted.findIndex((p) => p.id === photoId);
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
    setPhotos(withOrder);
    persistOrder(withOrder.map((p) => p.id));
  };

  return (
    <div className="flex flex-col gap-6 pb-32">
      <section className="rounded-2xl border border-brew-border bg-brew-surface p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-brew-text">사진 갤러리</h2>
          <p className="text-xs text-brew-muted">
            최대 {MAX_PHOTOS}장까지 업로드 가능 · 드래그하여 순서 변경
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {sorted.map((photo, idx) => (
            <PhotoSlot
              key={photo.id}
              photo={photo}
              index={idx}
              total={sorted.length}
              isDragging={dragId === photo.id}
              isDragOver={overId === photo.id && dragId !== photo.id}
              disabled={pending}
              onDelete={() => handleDelete(photo.id)}
              onSetPrimary={() => handleSetPrimary(photo.id)}
              onMoveUp={() => movePhoto(photo.id, "up")}
              onMoveDown={() => movePhoto(photo.id, "down")}
              onDragStart={() => setDragId(photo.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={() => setOverId(photo.id)}
              onDrop={() => {
                if (dragId) reorderById(dragId, photo.id);
                setDragId(null);
                setOverId(null);
              }}
            />
          ))}
          {emptySlots.map((_, idx) => (
            <EmptySlot
              key={`empty-${idx}`}
              showLabel={idx === 0 && sorted.length === 0}
              disabled={pending || isFull}
              onClick={triggerFilePicker}
            />
          ))}
        </div>

        {sorted.length === 0 && (
          <p className="mt-4 text-xs text-brew-muted">
            첫 번째 사진이 자동으로 대표 사진이 됩니다.
          </p>
        )}
      </section>
    </div>
  );
}

function PhotoSlot({
  photo,
  index,
  total,
  isDragging,
  isDragOver,
  disabled,
  onDelete,
  onSetPrimary,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  photo: BreweryPhotoItem;
  index: number;
  total: number;
  isDragging: boolean;
  isDragOver: boolean;
  disabled: boolean;
  onDelete: () => void;
  onSetPrimary: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", photo.id);
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
      className={`group relative aspect-square overflow-hidden rounded-xl border border-brew-border bg-brew-bg transition-all ${
        isDragging ? "opacity-40" : ""
      } ${isDragOver ? "ring-2 ring-brew-accent" : ""}`}
    >
      {photo.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.thumbUrl}
          alt={photo.caption ?? "양조장 사진"}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-brew-muted">
          이미지 로드 실패
        </div>
      )}

      {photo.isPrimary && (
        <span className="absolute left-2 top-2 rounded-md bg-brew-accent-light px-2 py-0.5 text-[11px] font-semibold text-brew-accent-light-text shadow-sm">
          대표
        </span>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={disabled}
        aria-label="사진 삭제"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-brew-text shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 md:opacity-0 md:group-hover:opacity-100"
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
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      {!photo.isPrimary && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSetPrimary();
          }}
          disabled={disabled}
          className="absolute left-2 bottom-2 rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-brew-text shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 md:opacity-0 md:group-hover:opacity-100"
        >
          대표로
        </button>
      )}

      <div className="absolute bottom-2 right-2 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 md:transition">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={disabled || index === 0}
          aria-label="앞으로 이동"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-brew-text shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
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
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={disabled || index === total - 1}
          aria-label="뒤로 이동"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-brew-text shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
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
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function EmptySlot({
  showLabel,
  disabled,
  onClick,
}: {
  showLabel: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-brew-border bg-brew-bg text-brew-muted transition-colors hover:border-brew-accent hover:text-brew-text disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
      {showLabel && <span className="text-xs font-medium">사진 추가</span>}
    </button>
  );
}
