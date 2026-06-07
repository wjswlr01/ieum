import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_EXPIRES_SEC = 60 * 60 * 24; // 24h — 페이지 로드마다 새로 발급

// 무료 플랜은 image transform 미지원 → 기본 false. Pro 이상에서 env "true"로 켬.
const useTransform = process.env.USE_IMAGE_TRANSFORM === "true";

// public bucket URL 합성용. SDK 의존 제거로 throw 위험 0.
const PUBLIC_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase Storage 설정이 누락되었습니다. NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 .env.local에 추가하세요."
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export async function uploadPhoto(
  bucket: string,
  path: string,
  body: ArrayBuffer | Buffer,
  contentType: string
): Promise<void> {
  const { error } = await getClient()
    .storage.from(bucket)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;
}

export async function deletePhotoFromStorage(
  bucket: string,
  path: string
): Promise<void> {
  const { error } = await getClient().storage.from(bucket).remove([path]);
  if (error) throw error;
}

// 클라이언트 직접 업로드용 signed upload URL 발급 (서버 전용).
// 토큰 자체가 인증이라 anon key 불필요. 토큰은 해당 path 전용으로 squat 불가.
export async function createSignedUploadUrl(
  bucket: string,
  path: string,
): Promise<{ signedUrl: string; token: string; path: string }> {
  const { data, error } = await getClient()
    .storage.from(bucket)
    .createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error(`signed upload URL 생성 실패: ${error?.message ?? "unknown"}`);
  }
  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

type Size = "thumb" | "full";

const TRANSFORM_OPTS: Record<Size, { width: number; height?: number; quality: number; resize?: "cover" | "contain" }> = {
  thumb: { width: 400, height: 400, quality: 75, resize: "cover" },
  full: { width: 1920, quality: 90 },
};

// public bucket(brewery-photos)용 동기 헬퍼.
// SDK(getClient/getPublicUrl) 의존 없이 직접 URL 합성 — throw 위험 0.
// path가 http(s)로 시작하면 외부 URL로 간주하고 그대로 반환 (향후 외부 URL seed 대비 안전망).
export function getPublicPhotoUrl(bucket: string, path: string, size: Size): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!PUBLIC_BASE) return "";

  const opts = TRANSFORM_OPTS[size];
  if (!useTransform) {
    return `${PUBLIC_BASE}/storage/v1/object/public/${bucket}/${path}`;
  }
  const qs = new URLSearchParams({
    width: String(opts.width),
    ...(opts.height ? { height: String(opts.height) } : {}),
    quality: String(opts.quality),
    ...(opts.resize ? { resize: opts.resize } : {}),
  });
  return `${PUBLIC_BASE}/storage/v1/render/image/public/${bucket}/${path}?${qs.toString()}`;
}

export async function getPhotoUrl(
  bucket: string,
  path: string,
  size: Size
): Promise<string> {
  const client = getClient();

  if (useTransform) {
    try {
      const opts = TRANSFORM_OPTS[size];
      const { data, error } = await client.storage.from(bucket).createSignedUrl(
        path,
        SIGNED_URL_EXPIRES_SEC,
        {
          transform: {
            width: opts.width,
            ...(opts.height ? { height: opts.height } : {}),
            quality: opts.quality,
            ...(opts.resize ? { resize: opts.resize } : {}),
          },
        }
      );
      if (error) throw error;
      if (data?.signedUrl) return data.signedUrl;
    } catch (e) {
      console.warn("[storage] image transform 실패, 원본 URL로 폴백:", e);
    }
  }

  // 폴백: transform 없이 원본 signed URL
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_SEC);
  if (error || !data?.signedUrl) {
    throw new Error(`signed URL 생성 실패: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}
