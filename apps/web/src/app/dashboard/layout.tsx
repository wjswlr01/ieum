import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import UserMenu from "./user-menu";

const NAV = [
  { href: "/dashboard", label: "홈" },
  { href: "/dashboard/recipes", label: "레시피" },
  { href: "/dashboard/batches", label: "배치" },
  { href: "/dashboard/inventory", label: "재고" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-brew-bg text-brew-text flex flex-col">
      <header className="bg-brew-dark flex items-center justify-between px-6 py-4 md:px-12 border-b border-brew-dark-border shrink-0">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-serif text-xl font-bold tracking-tight text-brew-text-light">
            이음
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[#B0A080] hover:text-brew-text-light transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <UserMenu
          userName={session.user.name ?? ""}
          userEmail={session.user.email ?? ""}
        />
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
