import UsersTable from "./users-table";

export default function AdminUsersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-xl md:text-2xl font-bold">회원 관리</h1>
        <p className="mt-1 text-sm text-brew-muted">전체 회원을 검색하고 권한을 조정합니다.</p>
      </div>
      <UsersTable />
    </div>
  );
}
