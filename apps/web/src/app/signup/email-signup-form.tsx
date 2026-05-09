"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import EmailInput from "@/components/EmailInput";

export default function EmailSignupForm() {
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

    if (result?.error) router.push("/login");
    else router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="name" className="sr-only">이름</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (8자 이상)"
          className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
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
        {loading ? "처리 중..." : "양조장 개설하기"}
      </button>
    </form>
  );
}
