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
    })
  );
}
if (SOCIAL_PROVIDERS.naver) {
  providers.push(
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
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
    async signIn({ user }) {
      // 기존 이메일 가입자가 같은 이메일로 OAuth 로그인 시 PrismaAdapter가
      // Account를 자동 link 함. tenant가 이미 있으면 그대로 통과.
      if (!user.email) return false;
      return true;
    },
    async jwt({ token, user }) {
      // 첫 로그인 — adapter가 user를 새로 생성/조회한 시점.
      // user 객체에는 tenantId/role 등이 빠져 있을 수 있어 DB에서 다시 fetch.
      if (user?.email || (token.email && !token.tenantId)) {
        const email = (user?.email ?? token.email)?.toLowerCase().trim();
        if (email) {
          const dbUser = await db.user.findUnique({ where: { email } });
          if (dbUser) {
            token.id = dbUser.id;
            token.tenantId = dbUser.tenantId ?? "";
            token.role = dbUser.role;
            token.isAdmin = dbUser.isAdmin;
          }
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
