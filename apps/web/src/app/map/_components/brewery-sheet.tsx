"use client";

import Link from "next/link";
import { Drawer } from "vaul";
import type { BreweryDetail } from "@/lib/actions/brewery";

type Props = {
  open: boolean;
  brewery: BreweryDetail | null;
  isFetching: boolean;
  onClose: () => void;
};

export default function BrewerySheet({ open, brewery, isFetching, onClose }: Props) {
  // Vaul snapPoints + modal=false 조합이 1.1.x에서 Drawer.Content transform이
  // 0으로 적용 안 되어 화면 밖에 mount되는 이슈가 있어 snapPoints 제거.
  // 대신 max-h-[80vh] + drag로 닫기는 Vaul 기본 동작으로 처리.
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
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[80vh] flex-col rounded-t-2xl border border-brew-border bg-white shadow-2xl outline-none md:hidden"
        >
          <Drawer.Title className="sr-only">
            {brewery?.name ?? "양조장 정보"}
          </Drawer.Title>
          <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-stone-300" />
          {brewery ? (
            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-3">
              <h2
                className="font-serif text-2xl font-bold text-brew-text"
                style={{ fontFamily: "'Nanum Myeongjo', serif" }}
              >
                {brewery.name}
              </h2>
              <p className="mt-1 text-sm text-brew-muted">{brewery.address}</p>

              <div className="mt-5 rounded-lg border border-dashed border-brew-border bg-brew-surface px-4 py-3 text-xs text-brew-muted">
                💡 Phase 4-revisit 예정: 사진 갤러리, 제품, 운영 정보, 스토리, 미니맵
              </div>

              <Link
                href={`/map/brewery/${brewery.id}/reviews`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brew-accent hover:text-brew-accent-hover"
              >
                <span>후기 보기 / 작성하기</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-5 py-10">
              <p className="text-sm text-brew-muted">
                {isFetching ? "불러오는 중..." : "양조장 정보를 찾을 수 없습니다"}
              </p>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
