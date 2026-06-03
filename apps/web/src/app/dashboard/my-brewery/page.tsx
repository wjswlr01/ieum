import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBreweryPhotos } from "@/lib/actions/brewery-photo";
import MyBreweryClient from "./my-brewery-client";
import NoBreweryView from "./no-brewery-view";

export const dynamic = "force-dynamic";

export default async function MyBreweryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if (!session.user.tenantId) {
    return <NoBreweryView />;
  }

  const brewery = await db.brewery.findUnique({
    where: { tenantId: session.user.tenantId },
    select: {
      id: true,
      name: true,
      tagline: true,
      description: true,
      address: true,
      region: true,
      city: true,
      website: true,
      businessNumber: true,
    },
  });

  if (!brewery) {
    return <NoBreweryView />;
  }

  const photos = await getBreweryPhotos(brewery.id);

  return (
    <MyBreweryClient
      brewery={{
        id: brewery.id,
        name: brewery.name,
        tagline: brewery.tagline,
        description: brewery.description,
        address: brewery.address,
        region: brewery.region,
        city: brewery.city,
        website: brewery.website,
        businessNumber: brewery.businessNumber,
      }}
      photos={photos}
    />
  );
}
