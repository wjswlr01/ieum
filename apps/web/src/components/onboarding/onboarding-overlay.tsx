"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type StepKind = "modal" | "highlight";

type Step = {
  id: number;
  kind: StepKind;
  selector?: string; // for highlight
  title: string;
  body: React.ReactNode;
  icon?: string;       // emoji 폴백
  brandIcon?: boolean; // true 이면 이음 로고 이미지 사용
};

const STEPS: Step[] = [
  {
    id: 1,
    kind: "modal",
    brandIcon: true,
    title: "이음에 오신 것을 환영합니다!",
    body: (
      <>
        <p>양조의 모든 과정을 한 곳에서 관리하세요.</p>
        <p className="mt-2 text-brew-muted">
          간단한 사용법을 안내해 드릴게요. (약 1분)
        </p>
      </>
    ),
  },
  {
    id: 2,
    kind: "highlight",
    selector: '[data-onboarding-step="2"]',
    title: "메뉴 살펴보기",
    body: (
      <>
        <p>여기서 모든 메뉴를 이동할 수 있어요.</p>
        <p className="mt-1.5 text-brew-muted">홈 · 레시피 · 배치 · 재고 · 더보기</p>
      </>
    ),
  },
  {
    id: 3,
    kind: "highlight",
    selector: '[data-onboarding-step="3"]',
    title: "레시피부터 시작",
    body: (
      <>
        <p>먼저 레시피를 만들어 보세요!</p>
        <p className="mt-1.5 text-brew-muted">
          막걸리(단양주/이양주/삼양주) 또는 맥주 레시피를 등록할 수 있어요. 기본 레시피 5종이 이미 준비되어 있어요.
        </p>
      </>
    ),
  },
  {
    id: 4,
    kind: "highlight",
    selector: '[data-onboarding-step="4"]',
    title: "배치 시작",
    body: (
      <>
        <p>레시피를 선택하면 '배치(양조 1회)'를 시작할 수 있어요.</p>
        <p className="mt-1.5 text-brew-muted">
          각 공정 단계를 순서대로 진행하며 실제값을 기록하세요.
        </p>
      </>
    ),
  },
  {
    id: 5,
    kind: "highlight",
    selector: '[data-onboarding-step="5"]',
    title: "발효 측정",
    body: (
      <>
        <p>발효 중에는 온도, 당도(Brix), pH 등을 매일 기록하세요.</p>
        <p className="mt-1.5 text-brew-muted">
          그래프로 발효 추이를 한눈에 볼 수 있어요. 예상 알코올 도수(ABV)도 자동으로 계산됩니다!
        </p>
      </>
    ),
  },
  {
    id: 6,
    kind: "highlight",
    selector: '[data-onboarding-step="6"]',
    title: "재고 관리",
    body: (
      <>
        <p>재료를 등록하고 재고를 관리하세요.</p>
        <p className="mt-1.5 text-brew-muted">
          배치 시작 시 자동으로 재고가 차감됩니다. 재고가 부족하면 알림을 보내드려요. 🔔
        </p>
      </>
    ),
  },
  {
    id: 7,
    kind: "modal",
    icon: "🎉",
    title: "준비 완료!",
    body: (
      <>
        <p>첫 번째 레시피를 만들어 볼까요?</p>
      </>
    ),
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function findVisibleTarget(selector: string): { el: HTMLElement; rect: Rect } | null {
  if (typeof document === "undefined") return null;
  const els = document.querySelectorAll(selector);
  for (const el of Array.from(els) as HTMLElement[]) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        el,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
    }
  }
  return null;
}

const PADDING = 6;

export default function OnboardingOverlay({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [target, setTarget] = useState<Rect | null>(null);
  const [closing, setClosing] = useState(false);

  const step = STEPS[stepIdx]!;

  const recompute = useCallback(() => {
    if (step.kind === "modal" || !step.selector) {
      setTarget(null);
      return;
    }
    const found = findVisibleTarget(step.selector);
    setTarget(found?.rect ?? null);
  }, [step]);

  useEffect(() => {
    recompute();
    if (step.kind === "modal") return;
    const handle = () => recompute();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    const id = window.setInterval(recompute, 500); // 동적 리렌더 대응
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
      window.clearInterval(id);
    };
  }, [recompute, step]);

  // Body scroll lock during overlay
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function persistDone() {
    try {
      await fetch("/api/user/onboarding", { method: "PATCH" });
    } catch {}
  }

  async function handleSkip() {
    setClosing(true);
    await persistDone();
    onClose();
  }

  async function handleNext() {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      setClosing(true);
      await persistDone();
      onClose();
    }
  }

  async function handleStartRecipe() {
    setClosing(true);
    await persistDone();
    onClose();
    router.push("/dashboard/recipes/new");
  }

  async function handleGoHome() {
    setClosing(true);
    await persistDone();
    onClose();
  }

  if (closing) return null;

  // 진행 도트 표시 (welcome 1 = first dot, 7 = last)
  const dots = STEPS.map((_, i) => i === stepIdx);

  // ── 모달 (step 1, 7) ────────────────────────────────────────
  if (step.kind === "modal") {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)" }}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md rounded-2xl border-2 border-brew-accent bg-brew-surface p-6 shadow-2xl">
          {step.brandIcon ? (
            <div className="flex justify-center mb-4">
              <Image
                src="/icon-512.png"
                alt="이음"
                width={120}
                height={120}
                priority
                className="rounded-2xl shadow-md"
              />
            </div>
          ) : step.icon ? (
            <p className="text-center text-4xl mb-3" aria-hidden="true">
              {step.icon}
            </p>
          ) : null}
          <h2 className="text-xl md:text-2xl font-bold text-brew-text text-center mb-3">
            {step.title}
          </h2>
          <div className="text-sm text-brew-text text-center space-y-1 mb-5">
            {step.body}
          </div>

          <Dots dots={dots} />

          {stepIdx === 0 ? (
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={handleNext}
                className="w-full rounded-lg bg-brew-accent py-2.5 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors"
              >
                시작하기
              </button>
              <button
                onClick={handleSkip}
                className="w-full text-xs text-brew-muted underline hover:text-brew-text transition-colors py-1"
              >
                건너뛰기
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={handleStartRecipe}
                className="w-full rounded-lg bg-brew-accent py-2.5 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors"
              >
                레시피 만들기 →
              </button>
              <button
                onClick={handleGoHome}
                className="w-full rounded-lg border border-brew-border py-2.5 text-sm text-brew-text hover:border-brew-border-hover transition-colors"
              >
                홈으로 돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 하이라이트 (step 2~6) ───────────────────────────────────
  if (!target) {
    // 대상 미발견: dim만 띄우고 중앙에 안내 카드
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)" }}
        role="dialog"
        aria-modal="true"
      >
        <TooltipCard
          step={step}
          stepIdx={stepIdx}
          totalSteps={STEPS.length}
          dots={dots}
          onNext={handleNext}
          onSkip={handleSkip}
          isLastStep={false}
        />
      </div>
    );
  }

  // 말풍선 위치: 대상 아래 우선, 공간 부족하면 위
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const tooltipMaxW = Math.min(360, vw - 32);
  const tooltipEstH = 200;

  const spaceBelow = vh - (target.top + target.height);
  const placeBelow = spaceBelow > tooltipEstH + 24 || target.top < tooltipEstH + 24;

  const tooltipTop = placeBelow
    ? target.top + target.height + 12
    : Math.max(16, target.top - tooltipEstH - 12);
  const tooltipLeft = Math.min(
    Math.max(16, target.left + target.width / 2 - tooltipMaxW / 2),
    vw - tooltipMaxW - 16
  );

  return (
    <>
      {/* 하이라이트 박스 — box-shadow로 외부 dim, 내부는 투명 */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none z-[9998] rounded-md transition-all"
        style={{
          top: target.top - PADDING,
          left: target.left - PADDING,
          width: target.width + PADDING * 2,
          height: target.height + PADDING * 2,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
        }}
      />

      {/* 클릭 차단 — 하이라이트 외부 클릭 무시 */}
      <div className="fixed inset-0 z-[9997]" />

      {/* 말풍선 */}
      <div
        className="fixed z-[9999]"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipMaxW }}
        role="dialog"
        aria-modal="true"
      >
        <TooltipCard
          step={step}
          stepIdx={stepIdx}
          totalSteps={STEPS.length}
          dots={dots}
          onNext={handleNext}
          onSkip={handleSkip}
          isLastStep={false}
        />
      </div>
    </>
  );
}

function Dots({ dots }: { dots: boolean[] }) {
  return (
    <div className="flex justify-center gap-1.5">
      {dots.map((on, i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 rounded-full ${
            on ? "bg-brew-accent" : "bg-brew-border"
          }`}
        />
      ))}
    </div>
  );
}

function TooltipCard({
  step,
  stepIdx,
  totalSteps,
  dots,
  onNext,
  onSkip,
  isLastStep,
}: {
  step: Step;
  stepIdx: number;
  totalSteps: number;
  dots: boolean[];
  onNext: () => void;
  onSkip: () => void;
  isLastStep: boolean;
}) {
  return (
    <div className="rounded-2xl border-2 border-brew-accent bg-brew-surface p-4 shadow-2xl">
      <p className="text-[10px] font-mono text-brew-subtle mb-1">
        {stepIdx + 1} / {totalSteps}
      </p>
      <h3 className="text-base font-bold text-brew-text mb-1.5">
        {step.title}
      </h3>
      <div className="text-sm text-brew-text mb-4">{step.body}</div>
      <Dots dots={dots} />
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={onSkip}
          className="text-xs text-brew-muted underline hover:text-brew-text transition-colors"
        >
          건너뛰기
        </button>
        <button
          onClick={onNext}
          className="rounded-lg bg-brew-accent px-4 py-2 text-xs font-semibold text-white hover:bg-brew-accent-hover transition-colors"
        >
          {isLastStep ? "완료" : "다음"}
        </button>
      </div>
    </div>
  );
}
