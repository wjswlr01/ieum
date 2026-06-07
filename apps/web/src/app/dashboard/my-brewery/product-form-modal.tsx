"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { BrewType } from "@ieum/db";
import imageCompression from "browser-image-compression";
import {
  createBreweryProduct,
  updateBreweryProduct,
  createBreweryProductImageUploadUrl,
  abortBreweryProductImageUpload,
  type BreweryProductItem,
} from "@/lib/actions/brewery-product";

const COMPRESS_OPTS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  preserveExif: false,
};

const NAME_MAX = 80;
const VOLUME_MAX = 30;
const TEXT_MAX = 500;
const ACCEPT = "image/jpeg,image/png,image/heic,image/heif,image/webp";

const BREW_TYPE_OPTIONS: Array<{ value: BrewType | ""; label: string }> = [
  { value: "", label: "선택 안 함" },
  { value: "MAKGEOLLI", label: "막걸리" },
  { value: "CHEONGJU", label: "청주" },
  { value: "SOJU", label: "증류주" },
  { value: "FRUIT_WINE", label: "과실주" },
  { value: "BEER", label: "맥주" },
];

const INPUT_CLS =
  "w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none";

type FormState = {
  name: string;
  brewType: BrewType | "";
  alcoholContent: string;
  volume: string;
  price: string;
  features: string;
  ingredients: string;
};

function emptyForm(): FormState {
  return {
    name: "",
    brewType: "",
    alcoholContent: "",
    volume: "",
    price: "",
    features: "",
    ingredients: "",
  };
}

function toFormState(p: BreweryProductItem): FormState {
  return {
    name: p.name,
    brewType: p.brewType ?? "",
    alcoholContent: p.alcoholContent !== null ? String(p.alcoholContent) : "",
    volume: p.volume ?? "",
    price: p.price !== null ? String(p.price) : "",
    features: p.features ?? "",
    ingredients: p.ingredients ?? "",
  };
}

type Props =
  | {
      mode: "create";
      breweryId: string;
      open: boolean;
      onClose: () => void;
      onSuccess: (product: BreweryProductItem) => void;
    }
  | {
      mode: "edit";
      breweryId: string;
      product: BreweryProductItem;
      open: boolean;
      onClose: () => void;
      onSuccess: (product: BreweryProductItem) => void;
    };

export default function ProductFormModal(props: Props) {
  const { mode, open, onClose, onSuccess, breweryId } = props;
  const initialProduct = mode === "edit" ? props.product : null;

  const [form, setForm] = useState<FormState>(() =>
    initialProduct ? toFormState(initialProduct) : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 모달 열릴 때 초기화 / 모드/대상 변경 시 동기화
  useEffect(() => {
    if (!open) return;
    setForm(initialProduct ? toFormState(initialProduct) : emptyForm());
    setError(null);
    setImageFile(null);
    setRemoveImage(false);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open, initialProduct]);

  // preview objectURL 메모리 정리
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, pending, onClose]);

  const displayImageUrl = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (removeImage) return null;
    return initialProduct?.imageUrl ?? null;
  }, [previewUrl, removeImage, initialProduct]);

  if (!open) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setImageFile(f);
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("제품 이름을 입력해주세요.");
      return;
    }
    if (trimmedName.length > NAME_MAX) {
      setError(`제품 이름은 ${NAME_MAX}자 이내로 작성해주세요.`);
      return;
    }

    startTransition(async () => {
      // 1) 사진이 새로 선택됐다면: 압축 → signed URL → Supabase 직접 PUT → path 확보
      let newImagePath: string | null = null;
      if (imageFile) {
        let compressed: File;
        try {
          compressed = await imageCompression(imageFile, COMPRESS_OPTS);
        } catch (err) {
          console.error("[product-modal] 압축 실패:", err);
          setError("사진 압축에 실패했습니다.");
          return;
        }

        const urlRes = await createBreweryProductImageUploadUrl(
          breweryId,
          imageFile.name,
          compressed.type || "image/jpeg",
        );
        if (!urlRes?.success) {
          setError(urlRes?.error ?? "업로드 URL 생성 실패");
          return;
        }

        let putOk = false;
        try {
          const putRes = await fetch(urlRes.signedUrl, {
            method: "PUT",
            body: compressed,
            headers: { "Content-Type": compressed.type || "image/jpeg" },
          });
          putOk = putRes.ok;
        } catch (err) {
          console.error("[product-modal] Storage PUT 실패:", err);
        }
        if (!putOk) {
          setError("Storage 업로드에 실패했습니다.");
          return;
        }
        newImagePath = urlRes.path;
      }

      // 2) 서버 액션: 텍스트 필드 + (있다면) imagePath 만 전송 — file 자체는 안 보냄
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("brewType", form.brewType);
      fd.append("alcoholContent", form.alcoholContent);
      fd.append("volume", form.volume);
      fd.append("price", form.price);
      fd.append("features", form.features);
      fd.append("ingredients", form.ingredients);
      if (newImagePath) fd.append("imagePath", newImagePath);
      if (mode === "edit" && removeImage) fd.append("removeImage", "true");

      const res = mode === "create"
        ? await createBreweryProduct(breweryId, fd)
        : await updateBreweryProduct(initialProduct!.id, fd);
      if (!res?.success) {
        if (newImagePath) {
          // best-effort orphan 클린업
          await abortBreweryProductImageUpload(breweryId, newImagePath).catch(() => {});
        }
        setError(res?.error ?? "저장에 실패했습니다.");
        return;
      }
      onSuccess(res.product);
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-brew-surface md:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-brew-border px-5 py-4">
          <h2 className="text-base font-semibold text-brew-text">
            {mode === "create" ? "제품 추가" : "제품 수정"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full text-brew-muted hover:bg-brew-bg hover:text-brew-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-5">
            {/* 썸네일 */}
            <div>
              <div className="mb-2 text-sm font-medium text-brew-text">제품 사진</div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => handleImageChange(e.target.files)}
              />
              {displayImageUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImageUrl}
                    alt="제품 사진"
                    className="h-20 w-20 rounded-lg border border-brew-border object-cover"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handlePickImage}
                      disabled={pending}
                      className="rounded-md border border-brew-border bg-white px-3 py-1.5 text-xs font-medium text-brew-text hover:bg-brew-bg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      사진 교체
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={pending}
                      className="rounded-md border border-brew-border bg-white px-3 py-1.5 text-xs font-medium text-brew-danger hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      사진 제거
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePickImage}
                  disabled={pending}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-brew-border bg-brew-bg text-brew-muted hover:border-brew-accent hover:text-brew-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    width="18"
                    height="18"
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
                  <span className="mt-1 text-[11px]">사진 추가</span>
                </button>
              )}
            </div>

            {/* 이름 (필수) */}
            <Field
              label="제품 이름"
              required
              counter={`${form.name.length}/${NAME_MAX}`}
            >
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                maxLength={NAME_MAX}
                className={INPUT_CLS}
                placeholder="예: 이음 막걸리"
              />
            </Field>

            {/* 주종 + 도수 */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="주종">
                <select
                  value={form.brewType}
                  onChange={(e) =>
                    update("brewType", e.target.value as BrewType | "")
                  }
                  className={INPUT_CLS}
                >
                  {BREW_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="도수(%)">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={0}
                  max={100}
                  value={form.alcoholContent}
                  onChange={(e) => update("alcoholContent", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="예: 6"
                />
              </Field>
            </div>

            {/* 용량 + 가격 */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="용량">
                <input
                  type="text"
                  value={form.volume}
                  onChange={(e) => update("volume", e.target.value)}
                  maxLength={VOLUME_MAX}
                  className={INPUT_CLS}
                  placeholder="예: 750ml"
                />
              </Field>

              <Field label="가격(원)">
                <input
                  type="number"
                  inputMode="numeric"
                  step={100}
                  min={0}
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="예: 8000"
                />
              </Field>
            </div>

            {/* 특징 */}
            <Field
              label="특징"
              counter={`${form.features.length}/${TEXT_MAX}`}
            >
              <textarea
                value={form.features}
                onChange={(e) => update("features", e.target.value)}
                maxLength={TEXT_MAX}
                rows={3}
                className={`${INPUT_CLS} resize-none leading-relaxed`}
                placeholder="제품의 향, 맛, 특별한 점을 자유롭게 적어주세요"
              />
            </Field>

            {/* 원료 */}
            <Field
              label="원료"
              counter={`${form.ingredients.length}/${TEXT_MAX}`}
            >
              <textarea
                value={form.ingredients}
                onChange={(e) => update("ingredients", e.target.value)}
                maxLength={TEXT_MAX}
                rows={2}
                className={`${INPUT_CLS} resize-none leading-relaxed`}
                placeholder="예: 쌀, 누룩, 정제수"
              />
            </Field>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-brew-danger/30 bg-brew-danger-soft/30 px-4 py-3 text-sm text-brew-danger"
              >
                {error}
              </div>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-brew-border bg-brew-surface px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-brew-border bg-white px-4 py-2 text-sm font-medium text-brew-text hover:bg-brew-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brew-accent px-4 py-2 text-sm font-semibold text-brew-dark hover:bg-brew-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "저장 중..." : "저장"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  counter,
  children,
}: {
  label: string;
  required?: boolean;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-brew-text">
          {label}
          {required && <span className="ml-1 text-brew-danger">*</span>}
        </span>
        {counter && <span className="text-xs text-brew-muted">{counter}</span>}
      </div>
      {children}
    </label>
  );
}
