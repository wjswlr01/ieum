import Link from "next/link";
import InventoryForm from "./inventory-form";

export default function NewInventoryPage() {
  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-2xl mx-auto w-full">
      <Link
        href="/dashboard/inventory"
        className="mb-6 inline-block text-sm text-brew-muted hover:text-brew-text transition-colors"
      >
        ← 재고 목록
      </Link>
      <h1 className="text-xl md:text-2xl font-bold mt-2 mb-2">재료 등록</h1>
      <p className="text-sm text-brew-muted mb-8">재고 관리할 원재료를 등록합니다.</p>
      <InventoryForm />
    </main>
  );
}
