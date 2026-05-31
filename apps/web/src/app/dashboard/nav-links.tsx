"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "홈", exact: true },
  { href: "/dashboard/recipes", label: "레시피" },
  { href: "/dashboard/batches", label: "술빚기" },
  { href: "/map", label: "지도" },
  { href: "/dashboard/inventory", label: "재고" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-6" data-onboarding-step="2">
      {NAV.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const onboardStep =
          item.href === "/dashboard/recipes" ? "3"
          : item.href === "/dashboard/batches" ? "4"
          : item.href === "/dashboard/inventory" ? "6"
          : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            {...(onboardStep ? { "data-onboarding-step": onboardStep } : {})}
            className={`text-sm pb-px transition-colors ${
              isActive
                ? "text-brew-accent border-b border-brew-accent"
                : "text-[#B0A080] hover:text-brew-text-light"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
