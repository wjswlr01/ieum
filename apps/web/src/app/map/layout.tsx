import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import UserMenu from "../dashboard/user-menu";
import NavLinks from "../dashboard/nav-links";
import NotificationBell from "../dashboard/notification-bell";
import MobileBottomNav from "../dashboard/mobile-bottom-nav";

export default async function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen flex-col bg-brew-bg text-brew-text">
      <header className="z-[100] flex shrink-0 items-center justify-between border-b border-brew-dark-border bg-brew-dark px-4 py-3 md:px-12 md:py-4">
        <div className="flex min-w-0 items-center gap-3 md:gap-8">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2"
            aria-label="이음 홈"
          >
            <Image
              src="/icon-192.png"
              alt=""
              width={28}
              height={28}
              priority
              className="rounded-md"
            />
            <span className="hidden font-serif text-lg font-bold tracking-tight text-brew-text-light md:inline md:text-xl">
              이음
            </span>
          </Link>
          <NavLinks />
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <NotificationBell />
          <UserMenu
            userName={session.user.name ?? ""}
            userEmail={session.user.email ?? ""}
            isAdmin={session.user.isAdmin}
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col pb-14 md:pb-0">
        {children}
      </div>
      <MobileBottomNav isAdmin={session.user.isAdmin} />
    </div>
  );
}
