import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import { db } from "./db";
import { seedDefaultRecipes } from "./seed/default-recipes";
import { seedCatalog } from "./seed/catalog";

// ── 환경변수 기반 provider 활성화 (키 없으면 비활성) ──────────────
export const SOCIAL_PROVIDERS = {
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  kakao: !!(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET),
  naver: !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
} as const;

const providers: NextAuthOptions["providers"] = [];
if (SOCIAL_PROVIDERS.google) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}
if (SOCIAL_PROVIDERS.kakao) {
  providers.push(
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      // 카카오 계정 동의 항목에서 이메일이 선택일 수 있어 명시 매핑
      profile(profile: any) {
        return {
          id: String(profile.id),
          name:
            profile.kakao_account?.profile?.nickname ??
            profile.properties?.nickname ??
            null,
          email: profile.kakao_account?.email ?? null,
          image:
            profile.kakao_account?.profile?.profile_image_url ??
            profile.properties?.profile_image ??
            null,
        };
      },
    })
  );
}
if (SOCIAL_PROVIDERS.naver) {
  providers.push(
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      // 네이버 응답은 { response: { id, email, name, ... } } 형태
      profile(profile: any) {
        const r = profile.response ?? {};
        return {
          id: r.id,
          name: r.name ?? r.nickname ?? null,
          email: r.email ?? null,
          image: r.profile_image ?? null,
        };
      },
    })
  );
}

// ── 슬러그 충돌 회피 ──────────────────────────────────────────────
function slugifyKo(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return base || "brewery";
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugifyKo(name).slice(0, 40);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const exists = await db.tenant.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now()}`;
}

// ── 신규 OAuth 가입자: 양조장 + 시드 자동 생성 ────────────────────
async function bootstrapNewUser(userId: string, displayName: string | null) {
  const tenantName = `${displayName?.trim() || "내"}의 양조장`;
  const slug = await uniqueSlug(tenantName);

  const tenant = await db.tenant.create({
    data: { name: tenantName, slug },
  });

  await db.user.update({
    where: { id: userId },
    data: {
      tenantId: tenant.id,
      role: "OWNER",
      hasCompletedOnboarding: false,
    },
  });

  // 시드는 실패해도 가입은 막지 않음 (관리자가 사후 처리 가능)
  try {
    await seedCatalog(tenant.id);
    await seedDefaultRecipes(tenant.id);
  } catch (e) {
    console.error("[auth] bootstrap seed failed", e);
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  events: {
    async createUser({ user }) {
      // PrismaAdapter가 User row를 만든 직후 — tenantId가 아직 null인 상태.
      // 양조장 + 기본 재료 + 레시피 시드 생성.
      await bootstrapNewUser(user.id, user.name ?? null);
    },
  },
  callbacks: {
    async signIn() {
      // 이메일 미제공 케이스도 허용 (네이버는 동의항목에 따라 email 누락 가능).
      // PrismaAdapter가 Account를 자동 link / User를 자동 생성하므로 별도 처리 불필요.
      return true;
    },
    async jwt({ token, user }) {
      // user.id는 첫 로그인 시 (adapter가 createUser 후 호출), token.sub는 이후 요청.
      // 둘 중 하나로 DB 조회해 tenantId/role 등을 토큰에 채워둠.
      const userId = user?.id ?? (token.tenantId ? null : token.sub);
      if (userId) {
        const dbUser = await db.user.findUnique({ where: { id: userId } });
        if (dbUser) {
          token.id = dbUser.id;
          token.tenantId = dbUser.tenantId ?? "";
          token.role = dbUser.role;
          token.isAdmin = dbUser.isAdmin;
          if (dbUser.email) token.email = dbUser.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.tenantId = token.tenantId;
      session.user.role = token.role;
      session.user.isAdmin = token.isAdmin;
      return session;
    },
  },
};
