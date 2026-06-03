import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBreweryPhotos } from "@/lib/actions/brewery-photo";
import { getBreweryProducts } from "@/lib/actions/brewery-product";
import { getBreweryById } from "@/lib/actions/brewery";
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
      operatingHours: true,
      tourAvailable: true,
      tourBookingMethod: true,
      tourTimeInfo: true,
      tastingAvailable: true,
      tastingPriceInfo: true,
      tastingNote: true,
      parkingAvailable: true,
      parkingInfo: true,
      isPublished: true,
    },
  });

  if (!brewery) {
    return <NoBreweryView />;
  }

  const [photos, products, previewResult] = await Promise.all([
    getBreweryPhotos(brewery.id),
    getBreweryProducts(brewery.id),
    getBreweryById(brewery.id),
  ]);

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
        operatingHours: brewery.operatingHours,
        tourAvailable: brewery.tourAvailable,
        tourBookingMethod: brewery.tourBookingMethod,
        tourTimeInfo: brewery.tourTimeInfo,
        tastingAvailable: brewery.tastingAvailable,
        tastingPriceInfo: brewery.tastingPriceInfo,
        tastingNote: brewery.tastingNote,
        parkingAvailable: brewery.parkingAvailable,
        parkingInfo: brewery.parkingInfo,
        isPublished: brewery.isPublished,
      }}
      photos={photos}
      products={products}
      previewBrewery={previewResult.brewery}
    />
  );
}
