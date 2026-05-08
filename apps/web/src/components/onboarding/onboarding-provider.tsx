"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const OnboardingOverlay = dynamic(() => import("./onboarding-overlay"), {
  ssr: false,
});

export default function OnboardingProvider({
  initialOpen,
}: {
  initialOpen: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (initialOpen) {
      // 첫 페인트 후 데이터 속성이 마운트되도록 약간 지연
      const t = window.setTimeout(() => setOpen(true), 250);
      return () => window.clearTimeout(t);
    }
  }, [initialOpen]);

  if (!open) return null;
  return <OnboardingOverlay onClose={() => setOpen(false)} />;
}
