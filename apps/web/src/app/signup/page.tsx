"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmailInput from "@/components/EmailInput";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "회원가입에 실패했습니다.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-brew-bg text-brew-text flex flex-col">
      <header className="bg-brew-dark flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight text-brew-text-light">
          이음
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-xl md:text-2xl font-bold mb-1">회원가입</h1>
          <p className="text-sm text-brew-muted mb-8">양조장을 개설하고 시작하세요.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-brew-text mb-1.5" htmlFor="name">
                이름
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
                placeholder="홍길동"
              />
            </div>

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
                <span className="ml-1 text-brew-faint">(8자 이상)</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
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
              {loading ? "처리 중..." : "양조장 개설하기"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-brew-muted">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-brew-accent hover:text-brew-accent-hover transition-colors font-medium">
              로그인
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
