"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmailInput from "@/components/EmailInput";

type Step = "email" | "code" | "password" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/reset-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "인증코드 발송에 실패했습니다.");
      return;
    }

    if (data.devCode) setDevCode(data.devCode);
    setStep("code");
  }

  function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (code.trim().length !== 6) {
      setError("6자리 인증코드를 입력해주세요.");
      return;
    }
    setStep("password");
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "비밀번호 변경에 실패했습니다.");
      return;
    }

    setStep("done");
    setTimeout(() => router.push("/login"), 1800);
  }

  return (
    <div className="min-h-screen bg-brew-bg text-brew-text flex flex-col">
      <header className="bg-brew-dark flex items-center justify-between px-6 py-5 md:px-12">
        <Link
          href="/"
          className="font-serif text-xl font-bold tracking-tight text-brew-text-light"
        >
          이음
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl md:text-2xl font-bold mb-1">비밀번호 재설정</h1>
          <p className="text-sm text-brew-muted mb-8">
            {step === "email" && "가입하신 이메일을 입력해주세요."}
            {step === "code" && "이메일로 발송된 6자리 인증코드를 입력해주세요."}
            {step === "password" && "새 비밀번호를 입력해주세요."}
            {step === "done" && "비밀번호가 변경되었습니다."}
          </p>

          {devCode && step !== "done" && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <span className="font-semibold">[개발 모드]</span> 인증코드: {devCode}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleRequestCode} className="space-y-4">
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
                {loading ? "발송 중..." : "인증코드 발송"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm text-brew-text mb-1.5" htmlFor="code">
                  인증코드
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 font-mono text-base tracking-[0.4em] text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
                  placeholder="000000"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-brew-accent py-3 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors"
              >
                다음
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setDevCode(null);
                }}
                className="w-full text-center text-sm text-brew-muted hover:text-brew-text transition-colors"
              >
                이메일 다시 입력
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  className="block text-sm text-brew-text mb-1.5"
                  htmlFor="newPassword"
                >
                  새 비밀번호
                  <span className="ml-1 text-brew-faint">(8자 이상)</span>
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label
                  className="block text-sm text-brew-text mb-1.5"
                  htmlFor="confirmPassword"
                >
                  새 비밀번호 확인
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? "변경 중..." : "비밀번호 변경"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
              비밀번호가 변경되었습니다. 잠시 후 로그인 페이지로 이동합니다.
            </div>
          )}

          <p className="mt-6 text-center text-sm text-brew-muted">
            <Link
              href="/login"
              className="text-brew-accent hover:text-brew-accent-hover transition-colors font-medium"
            >
              로그인으로 돌아가기
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
