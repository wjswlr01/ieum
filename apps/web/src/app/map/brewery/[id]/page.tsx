import { redirect } from "next/navigation";

// Phase 3-D 이후 양조장 상세는 /map?brewery=[id] sheet/panel로 통합.
// 기존 _components/* 파일들은 Phase 4-revisit에서 sheet 콘텐츠로 재활용 예정.
export default function BreweryDetailRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/map?brewery=${params.id}`);
}
