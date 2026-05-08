import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import InventoryEditForm from "./inventory-edit-form";

type Props = { params: { id: string } };

export default async function InventoryEditPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const item = await db.inventory.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!item) notFound();

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-2xl mx-auto w-full">
      <nav className="flex items-center gap-2 text-sm text-brew-subtle mb-8">
        <Link href="/dashboard/inventory" className="hover:text-brew-text transition-colors">재고/도감</Link>
        <span>/</span>
        <Link href={`/dashboard/inventory/${item.id}`} className="hover:text-brew-text transition-colors">{item.name}</Link>
        <span>/</span>
        <span className="text-brew-text">편집</span>
      </nav>

      <h1 className="font-serif text-xl md:text-2xl font-bold mb-8">재료 편집</h1>
      <InventoryEditForm
        initial={{
          id: item.id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          sku: item.sku,
          reorderLevel: item.reorderLevel,
          notes: item.notes,
          metadata: item.metadata as Record<string, unknown> | null,
        }}
      />
    </main>
  );
}
