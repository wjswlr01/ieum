"use client";

import { useKakaoLoader } from "react-kakao-maps-sdk";

const KAKAO_MAP_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY ?? "";

/**
 * Kakao Map SDK를 1회만 비동기 로드하고 [loading, error] 튜플을 반환한다.
 * 라이브러리가 전역 싱글톤으로 관리하므로 페이지 여러 곳에서 호출해도 중복 로드되지 않는다.
 *
 * 사용 예:
 *   const [loading, error] = useKakaoMapLoader();
 *   if (loading) return <Skeleton />;
 *   if (error) return <ErrorState />;
 *   return <Map ... />;
 */
export function useKakaoMapLoader() {
  return useKakaoLoader({
    appkey: KAKAO_MAP_JS_KEY,
    libraries: ["services", "clusterer"],
  });
}
