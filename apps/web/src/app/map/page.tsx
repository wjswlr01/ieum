import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBreweriesForMap, getBreweryById } from "@/lib/actions/brewery";
import MapPageClient from "./_components/map-page-client";

type SearchParams = {
  q?: string;
  brewType?: string;
  region?: string;
  brewery?: string;
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [result, selected] = await Promise.all([
    getBreweriesForMap(),
    searchParams.brewery
      ? getBreweryById(searchParams.brewery)
      : Promise.resolve({ brewery: null }),
  ]);

  return (
    <MapPageClient
      breweries={result.breweries}
      breweryCount={result.total}
      initialBreweryId={searchParams.brewery ?? null}
      initialBrewery={selected.brewery}
      initialSearch={searchParams.q ?? ""}
      initialBrewType={searchParams.brewType?.split(",").filter(Boolean) ?? []}
      initialRegion={searchParams.region ?? ""}
      userName={session.user.name ?? ""}
      userEmail={session.user.email ?? ""}
    />
  );
}
