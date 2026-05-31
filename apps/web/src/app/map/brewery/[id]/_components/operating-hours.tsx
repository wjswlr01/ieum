"use client";

import { useEffect, useState } from "react";

type DayHours = { open: string; close: string } | null;
type Hours = Partial<Record<DayKey, DayHours>>;

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DAY_LABEL: Record<DayKey, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일",
};

// JS Date.getDay(): 0=일, 1=월, ...
const JS_DAY_TO_KEY: Record<number, DayKey> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function isOpenNow(hours: DayHours, now: Date): boolean {
  if (!hours) return false;
  const open = parseHHMM(hours.open);
  const close = parseHHMM(hours.close);
  if (open == null || close == null) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  // close가 open보다 작으면 자정 넘김 (간단 처리)
  if (close <= open) return cur >= open || cur < close;
  return cur >= open && cur < close;
}

function normalizeHours(raw: unknown): Hours | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Hours = {};
  for (const key of DAY_ORDER) {
    const val = (raw as Record<string, unknown>)[key];
    if (val === null || val === undefined) {
      out[key] = null;
      continue;
    }
    if (
      typeof val === "object" &&
      typeof (val as { open?: unknown }).open === "string" &&
      typeof (val as { close?: unknown }).close === "string"
    ) {
      out[key] = { open: (val as { open: string }).open, close: (val as { close: string }).close };
    }
  }
  // 하나라도 값 있으면 valid
  return Object.values(out).some((v) => v != null) ? out : null;
}

export default function OperatingHoursPanel({ raw }: { raw: unknown }) {
  const hours = normalizeHours(raw);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    // 1분마다 갱신
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!hours) {
    return (
      <p className="text-sm text-brew-muted">운영 시간이 아직 등록되지 않았습니다.</p>
    );
  }

  const todayKey = now ? JS_DAY_TO_KEY[now.getDay()] : null;
  const today = todayKey ? hours[todayKey] ?? null : null;
  const open = now && today ? isOpenNow(today, now) : false;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {now ? (
          today ? (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                open
                  ? "bg-green-100 text-green-900"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {open ? "영업 중" : "영업 종료"}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
              오늘 휴무
            </span>
          )
        ) : null}
        {today && (
          <span className="font-mono text-sm text-brew-text">
            오늘 {today.open} – {today.close}
          </span>
        )}
      </div>

      <ul className="space-y-1.5 border-t border-brew-border pt-3">
        {DAY_ORDER.map((key) => {
          const h = hours[key] ?? null;
          const isToday = key === todayKey;
          return (
            <li
              key={key}
              className={`flex items-center justify-between text-sm ${
                isToday ? "font-semibold text-brew-text" : "text-brew-muted"
              }`}
            >
              <span>{DAY_LABEL[key]}요일</span>
              <span className="font-mono">
                {h ? `${h.open} – ${h.close}` : "휴무"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
