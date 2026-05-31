import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBreweries, getBreweryById } from "@/lib/actions/brewery";
import { KakaoMap } from "./_components/kakao-map";
import { MapHeader } from "./_components/map-header";
import BreweryOverlay from "./_components/brewery-overlay";

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

  const brewTypeList = searchParams.brewType
    ? searchParams.brewType.split(",").filter(Boolean)
    : [];

  const [result, selected] = await Promise.all([
    getBreweries({
      ...(searchParams.q ? { search: searchParams.q } : {}),
      ...(brewTypeList.length > 0 ? { brewType: brewTypeList } : {}),
      ...(searchParams.region ? { region: searchParams.region } : {}),
      hasCoordinates: true,
      limit: 1000,
    }),
    searchParams.brewery
      ? getBreweryById(searchParams.brewery)
      : Promise.resolve({ brewery: null }),
  ]);

  return (
    <>
      <MapHeader
        initialSearch={searchParams.q ?? ""}
        initialBrewType={searchParams.brewType?.split(",").filter(Boolean) ?? []}
        initialRegion={searchParams.region ?? ""}
        userName={session.user.name ?? ""}
        userEmail={session.user.email ?? ""}
      />
      <div className="relative min-h-0 flex-1">
        <KakaoMap
          breweries={result.breweries}
          breweryCount={result.total}
          selectedBreweryId={searchParams.brewery ?? null}
        />
        <BreweryOverlay brewery={selected.brewery} />
      </div>
    </>
  );
}
