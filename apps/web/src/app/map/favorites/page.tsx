import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getFavorites } from "@/lib/actions/brewery";
import FavoritesClient from "./_components/favorites-client";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { favorites } = await getFavorites();

  return <FavoritesClient initialFavorites={favorites} />;
}
