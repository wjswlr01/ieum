import DirectoryClient from "./_components/directory-client";

export default function BreweriesDirectoryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">양조장 연결</h1>
        <p className="mt-1 text-sm text-brew-muted">
          공공데이터 양조장을 가입자(tenant)와 owner로 연결합니다.
        </p>
      </div>
      <DirectoryClient />
    </div>
  );
}
