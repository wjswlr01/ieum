"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BreweryDetail } from "@/lib/actions/brewery";
import BrewerySheet from "./brewery-sheet";
import BrewerySidePanel from "./brewery-side-panel";

type Props = {
  brewery: BreweryDetail | null;
};

export default function BreweryOverlay({ brewery }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClose = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("brewery");
    const qs = next.toString();
    router.replace(qs ? `/map?${qs}` : "/map");
  }, [router, searchParams]);

  return (
    <>
      <BrewerySheet open={brewery !== null} brewery={brewery} onClose={handleClose} />
      <BrewerySidePanel brewery={brewery} onClose={handleClose} />
    </>
  );
}
