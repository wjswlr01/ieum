import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getBreweryPhotos } from "@/lib/actions/brewery-photo";
import { getBreweryProducts } from "@/lib/actions/brewery-product";
import { getBreweryById } from "@/lib/actions/brewery";
import MyBreweryClient from "@/app/dashboard/my-brewery/my-brewery-client";

export const dynamic = "force-dynamic";

export default async function AdminBreweryEditPage({
  params,
}: {
  params: { breweryId: string };
}) {
  // admin/layout이 이미 isAdmin 게이트 처리

  const brewery = await db.brewery.findUnique({
    where: { id: params.breweryId },
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
      tenantId: true,
      tenant: { select: { name: true } },
    },
  });

  if (!brewery) notFound();

  const [photos, products, previewResult] = await Promise.all([
    getBreweryPhotos(brewery.id),
    getBreweryProducts(brewery.id),
    getBreweryById(brewery.id),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-xs">
        <Link
          href="/admin/breweries-directory"
          className="text-brew-muted hover:text-brew-text transition-colors"
        >
          ← 양조장 연결
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          ADMIN
        </span>
        <span className="text-sm font-medium text-amber-900">관리자 편집 모드</span>
        {brewery.tenant ? (
          <span className="text-xs text-amber-700">
            현재 owner: <span className="font-mono">{brewery.tenant.name}</span>
          </span>
        ) : (
          <span className="text-xs text-amber-700">미연결 양조장</span>
        )}
      </div>

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
    </div>
  );
}
