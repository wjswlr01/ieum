// 서버 전용 — Kakao REST API 키 접근 헬퍼.
// 이 파일을 클라이언트 컴포넌트에서 import 하지 말 것 (키 노출 금지).

import "server-only";

export function getKakaoRestApiKey(): string {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    throw new Error("KAKAO_REST_API_KEY environment variable is missing");
  }
  return key;
}
