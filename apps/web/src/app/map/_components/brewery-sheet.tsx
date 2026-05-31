"use client";

import { Drawer } from "vaul";
import type { BreweryDetail } from "@/lib/actions/brewery";
import BreweryDetailContent from "./brewery-detail-content";

type Props = {
  open: boolean;
  brewery: BreweryDetail | null;
  isFetching: boolean;
  onClose: () => void;
};

export default function BrewerySheet({ open, brewery, isFetching, onClose }: Props) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      modal={false}
      dismissible
    >
      <Drawer.Portal>
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] flex-col rounded-t-2xl border border-brew-border bg-white shadow-2xl outline-none md:hidden"
        >
          <Drawer.Title className="sr-only">
            {brewery?.name ?? "양조장 정보"}
          </Drawer.Title>
          <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-stone-300" />
          <div className="flex flex-1 flex-col overflow-y-auto pb-2">
            <BreweryDetailContent
              brewery={brewery}
              isFetching={isFetching}
              variant="sheet"
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
