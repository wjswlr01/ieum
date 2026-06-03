"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBrewery } from "@/lib/actions/brewery";
import type { MyBreweryData } from "./my-brewery-client";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DAY_LABEL: Record<DayKey, string> = {
  mon: "월요일",
  tue: "화요일",
  wed: "수요일",
  thu: "목요일",
  fri: "금요일",
  sat: "토요일",
  sun: "일요일",
};

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_OPEN = "10:00";
const DEFAULT_CLOSE = "18:00";
const DEFAULT_BREAK_START = "12:30";
const DEFAULT_BREAK_END = "13:30";

const INPUT_CLS =
  "w-full rounded-lg border border-brew-border bg-white px-3 py-2 text-sm text-brew-text focus:border-brew-accent focus:outline-none";
const TIME_INPUT_CLS =
  "w-28 rounded-lg border border-brew-border bg-white px-3 py-2 text-sm text-brew-text focus:border-brew-accent focus:outline-none disabled:bg-brew-bg disabled:text-brew-muted";

type DayHours = { open: string; close: string } | null;
type BreakTime = { start: string; end: string } | null;

type HoursForm = Record<DayKey, DayHours> & { breakTime: BreakTime };

type FormState = {
  hours: HoursForm;
  tourAvailable: boolean;
  tourBookingMethod: string;
  tourTimeInfo: string;
  tastingAvailable: boolean;
  tastingPriceInfo: string;
  tastingNote: string;
  parkingAvailable: boolean;
  parkingInfo: string;
};

function normalizeRaw(raw: unknown): HoursForm {
  const out: HoursForm = {
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null,
    breakTime: null,
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  for (const key of DAY_ORDER) {
    const v = obj[key];
    if (
      v &&
      typeof v === "object" &&
      typeof (v as { open?: unknown }).open === "string" &&
      typeof (v as { close?: unknown }).close === "string"
    ) {
      out[key] = {
        open: (v as { open: string }).open,
        close: (v as { close: string }).close,
      };
    }
  }
  const bt = obj.breakTime;
  if (
    bt &&
    typeof bt === "object" &&
    typeof (bt as { start?: unknown }).start === "string" &&
    typeof (bt as { end?: unknown }).end === "string"
  ) {
    out.breakTime = {
      start: (bt as { start: string }).start,
      end: (bt as { end: string }).end,
    };
  }
  return out;
}

function toFormState(b: MyBreweryData): FormState {
  return {
    hours: normalizeRaw(b.operatingHours),
    tourAvailable: b.tourAvailable,
    tourBookingMethod: b.tourBookingMethod ?? "",
    tourTimeInfo: b.tourTimeInfo ?? "",
    tastingAvailable: b.tastingAvailable,
    tastingPriceInfo: b.tastingPriceInfo ?? "",
    tastingNote: b.tastingNote ?? "",
    parkingAvailable: b.parkingAvailable,
    parkingInfo: b.parkingInfo ?? "",
  };
}

function hoursEqual(a: HoursForm, b: HoursForm): boolean {
  for (const key of DAY_ORDER) {
    const x = a[key];
    const y = b[key];
    if (x === null && y === null) continue;
    if (x === null || y === null) return false;
    if (x.open !== y.open || x.close !== y.close) return false;
  }
  const ax = a.breakTime;
  const bx = b.breakTime;
  if (ax === null && bx === null) return true;
  if (ax === null || bx === null) return false;
  return ax.start === bx.start && ax.end === bx.end;
}

function formEqual(a: FormState, b: FormState): boolean {
  return (
    hoursEqual(a.hours, b.hours) &&
    a.tourAvailable === b.tourAvailable &&
    a.tourBookingMethod === b.tourBookingMethod &&
    a.tourTimeInfo === b.tourTimeInfo &&
    a.tastingAvailable === b.tastingAvailable &&
    a.tastingPriceInfo === b.tastingPriceInfo &&
    a.tastingNote === b.tastingNote &&
    a.parkingAvailable === b.parkingAvailable &&
    a.parkingInfo === b.parkingInfo
  );
}

export default function HoursTab({
  brewery,
  onSaved,
}: {
  brewery: MyBreweryData;
  onSaved: (msg: string) => void;
}) {
  const router = useRouter();
  const [initial, setInitial] = useState<FormState>(() => toFormState(brewery));
  const [form, setForm] = useState<FormState>(() => toFormState(brewery));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(() => !formEqual(form, initial), [form, initial]);

  const updateDay = (day: DayKey, patch: Partial<{ open: string; close: string }>) => {
    setForm((prev) => {
      const cur = prev.hours[day] ?? { open: DEFAULT_OPEN, close: DEFAULT_CLOSE };
      return {
        ...prev,
        hours: {
          ...prev.hours,
          [day]: { ...cur, ...patch },
        },
      };
    });
    if (error) setError(null);
  };

  const toggleDayClosed = (day: DayKey, closed: boolean) => {
    setForm((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: closed ? null : { open: DEFAULT_OPEN, close: DEFAULT_CLOSE },
      },
    }));
    if (error) setError(null);
  };

  const toggleBreak = (enabled: boolean) => {
    setForm((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        breakTime: enabled
          ? prev.hours.breakTime ?? { start: DEFAULT_BREAK_START, end: DEFAULT_BREAK_END }
          : null,
      },
    }));
    if (error) setError(null);
  };

  const updateBreak = (patch: Partial<{ start: string; end: string }>) => {
    setForm((prev) => {
      const cur = prev.hours.breakTime ?? { start: DEFAULT_BREAK_START, end: DEFAULT_BREAK_END };
      return {
        ...prev,
        hours: {
          ...prev.hours,
          breakTime: { ...cur, ...patch },
        },
      };
    });
    if (error) setError(null);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const reset = () => {
    setForm(initial);
    setError(null);
  };

  const save = () => {
    // 시간 형식 검증
    for (const key of DAY_ORDER) {
      const v = form.hours[key];
      if (!v) continue;
      if (!HHMM_RE.test(v.open) || !HHMM_RE.test(v.close)) {
        setError(`${DAY_LABEL[key]} 시간 형식이 올바르지 않습니다.`);
        return;
      }
    }
    if (form.hours.breakTime) {
      const { start, end } = form.hours.breakTime;
      if (!HHMM_RE.test(start) || !HHMM_RE.test(end)) {
        setError("휴게시간 형식이 올바르지 않습니다.");
        return;
      }
    }

    startTransition(async () => {
      try {
        await updateBrewery(brewery.id, {
          operatingHours: form.hours,
          tourAvailable: form.tourAvailable,
          tourBookingMethod: form.tourBookingMethod,
          tourTimeInfo: form.tourTimeInfo,
          tastingAvailable: form.tastingAvailable,
          tastingPriceInfo: form.tastingPriceInfo,
          tastingNote: form.tastingNote,
          parkingAvailable: form.parkingAvailable,
          parkingInfo: form.parkingInfo,
        });
        const next: FormState = {
          ...form,
          tourBookingMethod: form.tourBookingMethod.trim(),
          tourTimeInfo: form.tourTimeInfo.trim(),
          tastingPriceInfo: form.tastingPriceInfo.trim(),
          tastingNote: form.tastingNote.trim(),
          parkingInfo: form.parkingInfo.trim(),
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

  return (
    <div className="flex flex-col gap-6 pb-32">
      {/* 운영 시간 */}
      <section className="rounded-2xl border border-brew-border bg-brew-surface p-5">
        <SectionHeader
          icon={
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          title="운영 시간"
          subtitle="요일별 시간 입력 · 휴무 토글"
        />

        <div className="mt-4 flex flex-col gap-2">
          {DAY_ORDER.map((day) => {
            const v = form.hours[day];
            const closed = v === null;
            return (
              <div
                key={day}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-brew-border bg-white px-3 py-2.5"
              >
                <span className="w-16 text-sm font-medium text-brew-text">
                  {DAY_LABEL[day]}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={v?.open ?? ""}
                    onChange={(e) => updateDay(day, { open: e.target.value })}
                    disabled={closed}
                    className={TIME_INPUT_CLS}
                  />
                  <span className="text-brew-muted">–</span>
                  <input
                    type="time"
                    value={v?.close ?? ""}
                    onChange={(e) => updateDay(day, { close: e.target.value })}
                    disabled={closed}
                    className={TIME_INPUT_CLS}
                  />
                </div>
                <div className="ml-auto">
                  <ToggleButton
                    checked={closed}
                    label={closed ? "휴무" : "영업"}
                    onChange={(next) => toggleDayClosed(day, next)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 휴게 시간 카드 */}
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-red-900">
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
                <path d="M3 11h18" />
                <path d="M12 2v9" />
                <path d="M9 22V12" />
                <path d="M15 22V12" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-red-900">휴게 시간</p>
                  <p className="text-xs text-red-900/70">
                    매일 동일하게 적용됩니다
                  </p>
                </div>
                <ToggleButton
                  checked={form.hours.breakTime !== null}
                  label={form.hours.breakTime !== null ? "사용" : "없음"}
                  onChange={toggleBreak}
                />
              </div>
              {form.hours.breakTime && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="time"
                    value={form.hours.breakTime.start}
                    onChange={(e) => updateBreak({ start: e.target.value })}
                    className={TIME_INPUT_CLS}
                  />
                  <span className="text-red-900/70">–</span>
                  <input
                    type="time"
                    value={form.hours.breakTime.end}
                    onChange={(e) => updateBreak({ end: e.target.value })}
                    className={TIME_INPUT_CLS}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 투어 */}
      <ServiceSection
        icon={
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
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
            <path d="M2 7h20" />
            <path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.5.5 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.5.5 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.5.5 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.5.5 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
          </svg>
        }
        title="투어"
        checked={form.tourAvailable}
        onToggle={(v) => update("tourAvailable", v)}
      >
        <Field label="예약 방법">
          <input
            type="text"
            value={form.tourBookingMethod}
            onChange={(e) => update("tourBookingMethod", e.target.value)}
            maxLength={200}
            className={INPUT_CLS}
            placeholder="예: 전화 예약 (010-1234-5678)"
          />
        </Field>
        <Field label="투어 시간">
          <input
            type="text"
            value={form.tourTimeInfo}
            onChange={(e) => update("tourTimeInfo", e.target.value)}
            maxLength={200}
            className={INPUT_CLS}
            placeholder="예: 매주 토요일 14:00, 16:00"
          />
        </Field>
      </ServiceSection>

      {/* 시음 */}
      <ServiceSection
        icon={
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
            <path d="M8 22h8" />
            <path d="M7 10h10" />
            <path d="M12 15v7" />
            <path d="M12 15a5 5 0 0 0 5-5V3H7v7a5 5 0 0 0 5 5Z" />
          </svg>
        }
        title="시음"
        checked={form.tastingAvailable}
        onToggle={(v) => update("tastingAvailable", v)}
      >
        <Field label="가격 정보">
          <input
            type="text"
            value={form.tastingPriceInfo}
            onChange={(e) => update("tastingPriceInfo", e.target.value)}
            maxLength={200}
            className={INPUT_CLS}
            placeholder="예: 5,000원 (3종 시음)"
          />
        </Field>
        <Field label="시음 안내" counter={`${form.tastingNote.length}/500`}>
          <textarea
            value={form.tastingNote}
            onChange={(e) => update("tastingNote", e.target.value)}
            maxLength={500}
            rows={3}
            className={`${INPUT_CLS} resize-none leading-relaxed`}
            placeholder="시음 진행 방식, 운영 안내 등을 자유롭게 적어주세요"
          />
        </Field>
      </ServiceSection>

      {/* 주차 */}
      <ServiceSection
        icon={
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
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
          </svg>
        }
        title="주차"
        checked={form.parkingAvailable}
        onToggle={(v) => update("parkingAvailable", v)}
      >
        <Field label="주차 안내" counter={`${form.parkingInfo.length}/500`}>
          <textarea
            value={form.parkingInfo}
            onChange={(e) => update("parkingInfo", e.target.value)}
            maxLength={500}
            rows={3}
            className={`${INPUT_CLS} resize-none leading-relaxed`}
            placeholder="주차 가능 대수, 위치 등을 적어주세요"
          />
        </Field>
      </ServiceSection>

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

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-brew-text">{icon}</span>
      <div className="flex flex-col">
        <h2 className="text-sm font-semibold text-brew-text">{title}</h2>
        {subtitle && <p className="text-xs text-brew-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function ServiceSection({
  icon,
  title,
  checked,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brew-border bg-brew-surface p-5">
      {checked && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-1 bg-brew-accent-light"
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <SectionHeader icon={icon} title={title} />
        <ToggleButton
          checked={checked}
          label={checked ? "가능" : "불가"}
          onChange={onToggle}
        />
      </div>
      {checked && (
        <div className="mt-4 flex flex-col gap-4">{children}</div>
      )}
    </section>
  );
}

function ToggleButton({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        checked
          ? "bg-brew-text text-brew-text-light"
          : "bg-brew-bg text-brew-muted"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-4 w-7 items-center rounded-full transition ${
          checked ? "bg-brew-accent" : "bg-brew-border"
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full bg-white shadow-sm transition ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

function Field({
  label,
  counter,
  children,
}: {
  label: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-brew-text">{label}</span>
        {counter && <span className="text-xs text-brew-muted">{counter}</span>}
      </div>
      {children}
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
