import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "./admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!session.user.isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-brew-bg text-brew-text flex flex-col">
      <header className="bg-brew-dark flex items-center justify-between px-6 py-4 md:px-12 border-b border-brew-dark-border shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="font-serif text-xl font-bold tracking-tight text-brew-text-light"
          >
            이음
          </Link>
          <span className="rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
            ADMIN
          </span>
          <span className="hidden sm:inline text-xs text-[#B0A080]">관리자 모드</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-[#B0A080] hover:text-brew-text-light transition-colors"
          >
            ← 일반 대시보드
          </Link>
          <span className="text-xs text-[#B0A080] hidden md:inline">
            {session.user.email}
          </span>
        </div>
      </header>

      <div className="flex-1 flex">
        <AdminSidebar />
        <main className="flex-1 px-6 py-8 md:px-10 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
