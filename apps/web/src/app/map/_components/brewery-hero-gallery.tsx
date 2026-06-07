type Photo = {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  caption: string | null;
};

type Props = {
  photos: Photo[];
  alt: string;
};

export default function BreweryHeroGallery({ photos, alt }: Props) {
  if (photos.length === 0) {
    return (
      <div className="mx-4 mt-4 flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-brew-border bg-brew-surface md:aspect-[21/9]">
        <p className="text-sm text-brew-muted">아직 등록된 사진이 없습니다</p>
      </div>
    );
  }

  const hero = photos[0]!;
  const secondary = photos.slice(1, 3);
  const remaining = Math.max(0, photos.length - 3);

  return (
    <div className="mx-4 mt-4 grid aspect-[4/3] grid-cols-3 gap-2 md:aspect-[21/9]">
      <div className="relative col-span-2 overflow-hidden rounded-xl bg-stone-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.fullUrl}
          alt={hero.caption ?? alt}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="grid grid-rows-2 gap-2">
        {[0, 1].map((idx) => {
          const photo = secondary[idx];
          const isLast = idx === 1 && remaining > 0;
          return (
            <div
              key={idx}
              className="relative overflow-hidden rounded-xl bg-stone-200"
            >
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.thumbUrl}
                  alt={photo.caption ?? alt}
                  className="h-full w-full object-cover"
                />
              )}
              {isLast && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
                  +{remaining} 사진
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
