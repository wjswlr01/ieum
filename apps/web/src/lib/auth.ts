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
      // 같은 이메일 다른 provider 가입 시 OAuthAccountNotLinked 회피
      allowDangerousEmailAccountLinking: true,
    })
  );
}
if (SOCIAL_PROVIDERS.kakao) {
  providers.push(
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
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
      allowDangerousEmailAccountLinking: true,
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
  // 콜백 에러 디버깅 — Vercel 로그에서 원인 식별용
  debug: true,
  logger: {
    error(code, metadata) {
      console.error("[NextAuth Error]", code, JSON.stringify(metadata, null, 2));
    },
    warn(code) {
      console.warn("[NextAuth Warn]", code);
    },
    debug(code, metadata) {
      console.log("[NextAuth Debug]", code, metadata ? JSON.stringify(metadata) : "");
    },
  },
  events: {
    async createUser({ user }) {
      // PrismaAdapter가 User row를 만든 직후 — tenantId가 아직 null인 상태.
      // 양조장 + 기본 재료 + 레시피 시드 생성.
      // 시드 실패해도 가입 자체는 막지 않도록 try/catch 로 감쌈.
      try {
        await bootstrapNewUser(user.id, user.name ?? null);
      } catch (e) {
        console.error("[NextAuth createUser event error]", e);
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("[NextAuth signIn]", {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        profileKeys: profile ? Object.keys(profile) : null,
      });
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
