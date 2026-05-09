"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import EmailInput from "@/components/EmailInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-brew-bg text-brew-text flex flex-col">
      <header className="bg-brew-dark flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="flex items-center gap-2" aria-label="이음 홈">
          <Image src="/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
          <span className="font-serif text-xl font-bold tracking-tight text-brew-text-light">이음</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/icon-512.png"
              alt="이음"
              width={80}
              height={80}
              priority
              className="rounded-2xl shadow-sm"
            />
            <h1 className="font-serif text-2xl font-bold mt-4">이음</h1>
          </div>
          <h2 className="font-serif text-xl md:text-2xl font-bold mb-1 text-center">로그인</h2>
          <p className="text-sm text-brew-muted mb-8 text-center">계속하려면 로그인하세요.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-brew-text mb-1.5" htmlFor="email">
                이메일
              </label>
              <EmailInput
                id="email"
                value={email}
                onChange={setEmail}
                required
                className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-brew-text mb-1.5" htmlFor="password">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brew-accent py-3 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm">
            <Link
              href="/reset-password"
              className="text-brew-muted hover:text-brew-text transition-colors"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </p>

          <p className="mt-6 text-center text-sm text-brew-muted">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-brew-accent hover:text-brew-accent-hover transition-colors font-medium">
              회원가입
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
