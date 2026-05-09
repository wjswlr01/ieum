import type { DefaultSession } from "next-auth";

// 세션은 jwt 콜백 이후 항상 채워진 값으로 가정 (가입 직후도 jwt 콜백에서 fetch).
// 어댑터가 콜백에 넘기는 User에는 tenantId 등이 없을 수 있어 모두 optional 처리.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    tenantId?: string;
    role?: string;
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tenantId: string;
    role: string;
    isAdmin: boolean;
  }
}
