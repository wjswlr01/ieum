import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBreweries } from "@/lib/actions/brewery";
import { KakaoMap } from "./_components/kakao-map";
import { MapHeader } from "./_components/map-header";

type SearchParams = {
  q?: string;
  brewType?: string;
  region?: string;
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

  const result = await getBreweries({
    ...(searchParams.q ? { search: searchParams.q } : {}),
    ...(brewTypeList.length > 0 ? { brewType: brewTypeList } : {}),
    ...(searchParams.region ? { region: searchParams.region } : {}),
    hasCoordinates: true,
    limit: 1000,
  });

  return (
    <div className="flex h-screen flex-col">
      <MapHeader
        initialSearch={searchParams.q ?? ""}
        initialBrewType={searchParams.brewType?.split(",").filter(Boolean) ?? []}
        initialRegion={searchParams.region ?? ""}
        userName={session.user.name ?? ""}
        userEmail={session.user.email ?? ""}
      />
      <KakaoMap breweries={result.breweries} breweryCount={result.total} />
    </div>
  );
}
