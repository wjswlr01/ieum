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
      <header className="bg-brew-dark flex items-center justify-between px-4 py-3 md:px-12 md:py-4 border-b border-brew-dark-border shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Link
            href="/admin"
            className="font-serif text-lg md:text-xl font-bold tracking-tight text-brew-text-light shrink-0"
          >
            이음
          </Link>
          <span className="rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shrink-0">
            ADMIN
          </span>
          <span className="hidden md:inline text-xs text-[#B0A080]">관리자 모드</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <Link
            href="/dashboard"
            className="text-xs md:text-sm text-[#B0A080] hover:text-brew-text-light transition-colors"
          >
            <span className="md:hidden">← 일반</span>
            <span className="hidden md:inline">← 일반 대시보드</span>
          </Link>
          <span className="text-xs text-[#B0A080] hidden lg:inline truncate max-w-[14rem]">
            {session.user.email}
          </span>
        </div>
      </header>

      <div className="flex-1 flex">
        <AdminSidebar />
        <main className="flex-1 px-4 py-6 md:px-10 md:py-8 max-w-7xl pb-24 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
