import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import UserMenu from "./user-menu";
import NavLinks from "./nav-links";
import NotificationBell from "./notification-bell";
import MobileBottomNav from "./mobile-bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-brew-bg text-brew-text flex flex-col">
      <header className="bg-brew-dark flex items-center justify-between px-4 py-3 md:px-12 md:py-4 border-b border-brew-dark-border shrink-0">
        <div className="flex items-center gap-3 md:gap-8 min-w-0">
          <Link
            href="/dashboard"
            className="font-serif text-lg md:text-xl font-bold tracking-tight text-brew-text-light shrink-0"
          >
            이음
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-1 md:gap-3 shrink-0">
          <NotificationBell />
          <UserMenu
            userName={session.user.name ?? ""}
            userEmail={session.user.email ?? ""}
            isAdmin={session.user.isAdmin}
          />
        </div>
      </header>
      <div className="flex-1 pb-16 md:pb-0">{children}</div>
      <MobileBottomNav isAdmin={session.user.isAdmin} />
    </div>
  );
}
