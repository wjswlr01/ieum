"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmailInput from "@/components/EmailInput";

export default function EmailLoginForm() {
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="email" className="sr-only">이메일</label>
        <EmailInput
          id="email"
          value={email}
          onChange={setEmail}
          required
          placeholder="이메일"
          className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
        />
      </div>

      <div>
        <label htmlFor="password" className="sr-only">비밀번호</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
          placeholder="비밀번호"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brew-dark py-3 text-sm font-semibold text-brew-text-light hover:bg-[#3D3830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>

      <p className="text-right">
        <Link
          href="/reset-password"
          className="text-xs text-brew-muted hover:text-brew-text transition-colors"
        >
          비밀번호를 잊으셨나요?
        </Link>
      </p>
    </form>
  );
}
