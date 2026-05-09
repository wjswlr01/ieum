import Link from "next/link";
import Image from "next/image";
import LoginButtons from "./login-buttons";
import EmailLoginForm from "./email-login-form";

// 빌드 타임이 아니라 요청 시점의 process.env를 읽도록 강제
export const dynamic = "force-dynamic";

export default function LoginPage() {
  // 매 요청마다 평가 — Vercel ENV가 빌드 후 추가되어도 즉시 반영됨
  const enabled = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    kakao: !!(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET),
    naver: !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
  };

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
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/icon-512.png"
              alt="이음"
              width={80}
              height={80}
              priority
              className="rounded-2xl shadow-sm"
            />
            <h1 className="font-serif text-2xl font-bold mt-4">이음</h1>
            <p className="mt-2 text-sm text-brew-muted text-center">
              양조의 모든 과정을 한 곳에서 관리하세요.
            </p>
          </div>

          <LoginButtons enabled={enabled} />

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-brew-border" />
            <span className="text-xs text-brew-faint">또는</span>
            <div className="h-px flex-1 bg-brew-border" />
          </div>

          <EmailLoginForm />

          <p className="mt-6 text-center text-sm text-brew-muted">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-brew-accent hover:text-brew-accent-hover transition-colors font-medium">
              회원가입
            </Link>
          </p>

          <p className="mt-3 text-center text-[11px] text-brew-faint leading-relaxed">
            계속하면 <span className="underline decoration-brew-faint underline-offset-2">이용약관</span> 및{" "}
            <span className="underline decoration-brew-faint underline-offset-2">개인정보처리방침</span>에
            동의하게 됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
