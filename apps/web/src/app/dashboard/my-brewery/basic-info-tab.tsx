"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBrewery } from "@/lib/actions/brewery";
import type { MyBreweryData } from "./my-brewery-client";

const NAME_MAX = 50;
const TAGLINE_MAX = 80;
const DESCRIPTION_MAX = 500;

const INPUT_CLS =
  "w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none";

type FormState = {
  name: string;
  tagline: string;
  description: string;
  website: string;
};

function toFormState(b: MyBreweryData): FormState {
  return {
    name: b.name,
    tagline: b.tagline ?? "",
    description: b.description ?? "",
    website: b.website ?? "",
  };
}

export default function BasicInfoTab({
  brewery,
  onSaved,
  onGoToPhotos,
}: {
  brewery: MyBreweryData;
  onSaved: (msg: string) => void;
  onGoToPhotos: () => void;
}) {
  const router = useRouter();
  const [initial, setInitial] = useState<FormState>(() => toFormState(brewery));
  const [form, setForm] = useState<FormState>(() => toFormState(brewery));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    return (
      form.name !== initial.name ||
      form.tagline !== initial.tagline ||
      form.description !== initial.description ||
      form.website !== initial.website
    );
  }, [form, initial]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const reset = () => {
    setForm(initial);
    setError(null);
  };

  const save = () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("양조장 이름을 입력해주세요.");
      return;
    }
    if (trimmedName.length > NAME_MAX) {
      setError(`양조장 이름은 ${NAME_MAX}자 이내로 작성해주세요.`);
      return;
    }
    if (form.tagline.trim().length > TAGLINE_MAX) {
      setError(`한 줄 소개는 ${TAGLINE_MAX}자 이내로 작성해주세요.`);
      return;
    }
    if (form.description.trim().length > DESCRIPTION_MAX) {
      setError(`상세 소개는 ${DESCRIPTION_MAX}자 이내로 작성해주세요.`);
      return;
    }

    startTransition(async () => {
      try {
        await updateBrewery(brewery.id, {
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          website: form.website,
        });
        const next: FormState = {
          name: trimmedName,
          tagline: form.tagline.trim(),
          description: form.description.trim(),
          website: form.website.trim(),
        };
        setInitial(next);
        setForm(next);
        onSaved("저장되었습니다");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  };

  const addressLine = brewery.city ? `${brewery.region} ${brewery.city}` : brewery.region;

  return (
    <div className="flex flex-col gap-6 pb-32">
      <section className="rounded-2xl border border-brew-border bg-brew-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-brew-text">양조장 사진</h2>
            <p className="mt-1 text-xs text-brew-muted">
              사진과 대표 사진은 사진 탭에서 관리합니다
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToPhotos}
            className="rounded-lg bg-brew-accent-light px-4 py-2 text-sm font-semibold text-brew-accent-light-text hover:brightness-95 transition"
          >
            사진 관리
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-brew-border bg-brew-surface p-5">
        <h2 className="text-sm font-semibold text-brew-text mb-4">기본 정보</h2>
        <div className="flex flex-col gap-5">
          <Field
            label="양조장 이름"
            required
            counter={`${form.name.length}/${NAME_MAX}`}
          >
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={NAME_MAX}
              className={INPUT_CLS}
              placeholder="예: 이음양조장"
            />
          </Field>

          <Field
            label="한 줄 소개"
            counter={`${form.tagline.length}/${TAGLINE_MAX}`}
            helper="양조장을 한 문장으로 표현해주세요"
          >
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              maxLength={TAGLINE_MAX}
              className={INPUT_CLS}
              placeholder="예: 전통과 현대가 만나는 자리"
            />
          </Field>

          <Field
            label="상세 소개"
            counter={`${form.description.length}/${DESCRIPTION_MAX}`}
          >
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={DESCRIPTION_MAX}
              rows={5}
              className={`${INPUT_CLS} resize-none leading-relaxed`}
              placeholder="양조장의 역사, 철학, 특별한 점을 자유롭게 적어주세요"
            />
          </Field>

          <Field
            label="사업자등록번호"
            helper="고객센터를 통해 변경할 수 있습니다"
          >
            <input
              type="text"
              value={brewery.businessNumber ?? "등록되지 않음"}
              disabled
              className={`${INPUT_CLS} bg-brew-bg text-brew-muted cursor-not-allowed`}
            />
          </Field>

          <Field label="웹사이트">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brew-muted">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
              <input
                type="text"
                inputMode="url"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className={`${INPUT_CLS} pl-9`}
                placeholder="example.com"
              />
            </div>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-brew-border bg-brew-surface p-5">
        <h2 className="text-sm font-semibold text-brew-text mb-4">주소</h2>
        <div className="rounded-xl border border-brew-border bg-brew-bg p-4">
          <p className="text-xs text-brew-muted mb-1">{addressLine}</p>
          <p className="text-sm text-brew-text">{brewery.address}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            window.alert("지도에서 주소 변경 기능은 추후 단계에서 지원됩니다.")
          }
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brew-accent hover:underline"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          지도에서 변경
        </button>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-brew-danger/30 bg-brew-danger-soft/30 px-4 py-3 text-sm text-brew-danger"
        >
          {error}
        </div>
      )}

      {isDirty && (
        <FloatingSaveBar pending={pending} onCancel={reset} onSave={save} />
      )}
    </div>
  );
}

function Field({
  label,
  required,
  counter,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  counter?: string;
  helper?: string;
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
      {helper && <p className="mt-1.5 text-xs text-brew-muted">{helper}</p>}
    </label>
  );
}

function FloatingSaveBar({
  pending,
  onCancel,
  onSave,
}: {
  pending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-6 md:px-12">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-brew-border bg-brew-surface px-4 py-3 shadow-lg">
        <p className="text-sm text-brew-text">저장하지 않은 변경사항이 있습니다</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-brew-border bg-brew-bg px-3 py-1.5 text-sm font-medium text-brew-text hover:bg-brew-surface-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="rounded-lg bg-brew-accent px-4 py-1.5 text-sm font-semibold text-brew-dark hover:bg-brew-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
