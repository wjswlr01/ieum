"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPhoto, deletePhoto, type PhotoWithUrls } from "@/lib/actions/photo";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];

type BatchNodeOption = { id: string; label: string };

type Props = {
  batchId: string;
  isAdmin: boolean;
  batchNodes: BatchNodeOption[];
  initialPhotos: PhotoWithUrls[];
};

// ── 날짜별 그룹화 ─────────────────────────────────────────────

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function groupByDate(photos: PhotoWithUrls[]): Array<{ date: string; items: PhotoWithUrls[] }> {
  const map = new Map<string, PhotoWithUrls[]>();
  for (const p of photos) {
    const key = ymd(new Date(p.capturedAt));
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({ date, items }));
}

function formatGroupHeader(ymdStr: string): string {
  // "2026-05-12" → "2026년 5월 12일 (화)"
  const [y, m, d] = ymdStr.split("-").map(Number);
  if (!y || !m || !d) return ymdStr;
  const date = new Date(y, m - 1, d);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}

// ── 클라이언트 이미지 압축 ──────────────────────────────────────

async function compressImage(file: File, maxDim = 1920, quality = 0.85): Promise<File> {
  // HEIC/HEIF는 브라우저가 디코딩 못 하는 경우가 많아 원본 그대로 업로드
  if (file.type === "image/heic" || file.type === "image/heif") return file;

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("이미지 로드 실패"));
    im.src = dataUrl;
  });

  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  // 압축 불필요 (이미 작음 + 1MB 이하)
  if (ratio === 1 && file.size < 1024 * 1024) return file;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
}

// ── 메인 ─────────────────────────────────────────────────────

export default function PhotoGallery({ batchId, isAdmin, batchNodes, initialPhotos }: Props) {
  const router = useRouter();
  const photos = initialPhotos;
  const groups = groupByDate(photos);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<PhotoWithUrls | null>(null);

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-brew-text">사진 기록</h2>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-lg border border-brew-accent/40 px-3 py-1.5 text-xs text-brew-accent hover:bg-brew-accent/10 transition-colors"
          >
            + 사진 추가
          </button>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="rounded-xl border border-brew-border bg-brew-surface p-6 text-center">
          <p className="text-sm text-brew-subtle mb-1">아직 등록된 사진이 없습니다.</p>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors"
            >
              첫 번째 사진 추가하기 →
            </button>
          ) : (
            <p className="text-xs text-brew-faint">사진 업로드 기능은 현재 관리자 전용입니다.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <div key={g.date}>
              <p className="text-xs text-brew-subtle mb-2 font-medium">{formatGroupHeader(g.date)}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {g.items.map((p) => (
                  <PhotoTile
                    key={p.id}
                    photo={p}
                    isAdmin={isAdmin}
                    onClick={() => setViewerPhoto(p)}
                    onDeleted={() => router.refresh()}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          batchId={batchId}
          batchNodes={batchNodes}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false);
            router.refresh();
          }}
        />
      )}

      {viewerPhoto && (
        <PhotoViewer photo={viewerPhoto} onClose={() => setViewerPhoto(null)} />
      )}
    </div>
  );
}

// ── 그리드 타일 ───────────────────────────────────────────────

function PhotoTile({
  photo,
  isAdmin,
  onClick,
  onDeleted,
}: {
  photo: PhotoWithUrls;
  isAdmin: boolean;
  onClick: () => void;
  onDeleted: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      const res = await deletePhoto(photo.id);
      if (res.success) onDeleted();
      else alert(res.error);
    });
  }

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-brew-border bg-brew-surface">
      <button
        type="button"
        onClick={onClick}
        className="block w-full h-full focus:outline-none focus:ring-2 focus:ring-brew-accent"
      >
        {photo.thumbUrl ? (
          // 외부 도메인 이미지라 next/image 대신 일반 img 사용 (signed URL이라 캐싱도 제한적)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.thumbUrl}
            alt={photo.caption ?? "사진"}
            loading="lazy"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brew-faint text-xs">
            로드 실패
          </div>
        )}
        {photo.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
            <p className="text-[11px] text-white line-clamp-2">{photo.caption}</p>
          </div>
        )}
      </button>

      {isAdmin && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className={`absolute top-1.5 right-1.5 rounded-md px-2 py-1 text-[10px] font-semibold shadow-md transition-opacity ${
            confirming
              ? "bg-red-600 text-white opacity-100"
              : "bg-white/90 text-red-600 opacity-0 group-hover:opacity-100"
          } disabled:opacity-50`}
          title={confirming ? "한번 더 클릭하면 삭제" : "삭제"}
        >
          {isPending ? "..." : confirming ? "삭제 확인" : "✕"}
        </button>
      )}
    </div>
  );
}

// ── 풀스크린 뷰어 ─────────────────────────────────────────────

function PhotoViewer({ photo, onClose }: { photo: PhotoWithUrls; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white w-9 h-9 flex items-center justify-center text-lg"
        aria-label="닫기"
      >
        ✕
      </button>
      <div
        className="max-w-full max-h-full flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {photo.fullUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.fullUrl}
            alt={photo.caption ?? "사진"}
            className="max-w-full max-h-[85vh] object-contain rounded"
          />
        ) : (
          <p className="text-white">이미지를 불러올 수 없습니다.</p>
        )}
        <div className="text-center text-white/80 text-xs space-y-0.5 max-w-lg">
          {photo.caption && <p className="text-sm">{photo.caption}</p>}
          <p className="font-mono">
            {new Date(photo.capturedAt).toLocaleDateString("ko-KR")}
            {" · "}
            {photo.uploadedBy.name ?? photo.uploadedBy.email ?? "?"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 업로드 모달 ───────────────────────────────────────────────

function UploadModal({
  batchId,
  batchNodes,
  onClose,
  onUploaded,
}: {
  batchId: string;
  batchNodes: BatchNodeOption[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [batchNodeId, setBatchNodeId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) {
      setSelectedFile(null);
      return;
    }
    if (!ALLOWED_MIME.includes(f.type)) {
      setError(`지원하지 않는 형식입니다 (${f.type || "unknown"}). JPEG/PNG/HEIC/WebP만 가능합니다.`);
      setSelectedFile(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("파일이 10MB를 초과합니다.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(f);
  }

  function submit() {
    if (!selectedFile) {
      setError("파일을 선택하세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const compressed = await compressImage(selectedFile);
        const fd = new FormData();
        fd.append("file", compressed);
        fd.append("batchId", batchId);
        fd.append("capturedAt", new Date(capturedAt).toISOString());
        if (batchNodeId) fd.append("batchNodeId", batchNodeId);
        if (caption) fd.append("caption", caption);
        const res = await createPhoto(fd);
        if (res.success) onUploaded();
        else setError(res.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드 실패");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-lg font-bold text-brew-text mb-4">사진 추가</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-brew-muted font-medium mb-1.5">파일</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
              onChange={onFileChange}
              className="w-full text-xs text-brew-text file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-brew-accent/10 file:text-brew-accent file:text-xs file:font-semibold hover:file:bg-brew-accent/20"
            />
            <p className="text-[11px] text-brew-faint mt-1">JPEG/PNG/HEIC/WebP · 최대 10MB</p>
          </div>

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="미리보기"
              className="w-full max-h-60 object-contain rounded-lg border border-brew-border bg-brew-surface"
            />
          )}

          <div>
            <label className="block text-xs text-brew-muted font-medium mb-1.5">촬영일</label>
            <input
              type="date"
              value={capturedAt}
              onChange={(e) => setCapturedAt(e.target.value)}
              className="w-full rounded border border-brew-border bg-white px-2 py-1.5 text-xs text-brew-text focus:border-brew-accent focus:outline-none"
            />
          </div>

          {batchNodes.length > 0 && (
            <div>
              <label className="block text-xs text-brew-muted font-medium mb-1.5">
                관련 공정 <span className="text-brew-faint">(선택)</span>
              </label>
              <select
                value={batchNodeId}
                onChange={(e) => setBatchNodeId(e.target.value)}
                className="w-full rounded border border-brew-border bg-white px-2 py-1.5 text-xs text-brew-text focus:border-brew-accent focus:outline-none"
              >
                <option value="">— 선택 안 함 —</option>
                {batchNodes.map((n) => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-brew-muted font-medium mb-1.5">
              메모 <span className="text-brew-faint">(선택)</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              placeholder="예: 발효 5일차, 거품 활발"
              className="w-full rounded border border-brew-border bg-white px-2 py-1.5 text-xs text-brew-text focus:border-brew-accent focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-xl border border-brew-border py-2.5 text-sm font-medium text-brew-muted hover:border-brew-border-hover transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isPending || !selectedFile}
              className="flex-1 rounded-xl bg-brew-dark py-2.5 text-sm font-semibold text-brew-text-light hover:bg-[#3D3830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "업로드 중..." : "업로드"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
