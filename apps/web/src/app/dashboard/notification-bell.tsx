"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  referenceId: string | null;
  createdAt: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function typeIcon(type: string) {
  if (type === "LOW_STOCK") return "📦";
  if (type === "FERMENTATION_REMINDER") return "🧪";
  if (type === "BATCH_STATUS") return "✅";
  return "🔔";
}

function notificationHref(notification: Notification) {
  if (!notification.referenceId) return null;
  if (notification.type === "LOW_STOCK") return `/dashboard/inventory`;
  if (notification.type === "FERMENTATION_REMINDER") return `/dashboard/batches/${notification.referenceId}`;
  if (notification.type === "BATCH_STATUS") return `/dashboard/batches/${notification.referenceId}/tasting`;
  return null;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {}
  }, []);

  // 페이지 로드 시 알림 체크 + 목록 조회
  useEffect(() => {
    async function init() {
      try {
        await fetch("/api/notifications/check", { method: "POST" });
      } catch {}
      fetchNotifications();
    }
    init();
  }, [fetchNotifications]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open) {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) await markRead(notification.id);
    const href = notificationHref(notification);
    setOpen(false);
    if (href) router.push(href);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        title="알림"
        aria-label="알림"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#B0A080] hover:text-brew-text-light hover:bg-white/5 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brew-accent text-[10px] font-bold text-[#1A1814] px-0.5 leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-brew-dark-border bg-[#2D2A22] shadow-xl z-50 overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-brew-dark-border">
            <span className="text-sm font-semibold text-brew-text-light">알림</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#B0A080] hover:text-brew-text-light transition-colors"
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 목록 */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-[#B0A080]">불러오는 중…</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#B0A080]">알림이 없습니다</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-brew-dark-border/50 last:border-0 hover:bg-white/5 transition-colors ${
                    !n.isRead ? "bg-brew-accent/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-brew-text-light truncate">{n.title}</p>
                        {!n.isRead && (
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brew-accent" />
                        )}
                      </div>
                      <p className="text-xs text-[#B0A080] leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-[#6B6560] mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
