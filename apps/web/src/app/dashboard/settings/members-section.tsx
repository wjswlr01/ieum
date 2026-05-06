"use client";

import { useState, useTransition } from "react";
import {
  updateTenantName,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "@/lib/actions/settings";

type Member = { id: string; name: string; email: string; role: string };

const ROLE_LABEL: Record<string, string> = {
  OWNER: "오너",
  MANAGER: "매니저",
  BREWER: "양조사",
  VIEWER: "뷰어",
};

export function TenantSection({
  initialName,
  plan = "FREE",
}: {
  initialName: string;
  plan?: string;
}) {
  const [name, setName] = useState(initialName);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateTenantName(name);
        setMsg("저장되었습니다.");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "오류가 발생했습니다.");
      }
    });
  }

  const planColor =
    plan === "PRO"
      ? "text-blue-700 bg-blue-50 border-blue-200"
      : plan === "ENTERPRISE"
      ? "text-purple-700 bg-purple-50 border-purple-200"
      : "text-brew-subtle bg-brew-surface border-brew-border";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm text-brew-text mb-1.5">양조장 이름</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className="rounded-lg bg-brew-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
        {msg && (
          <p className={`mt-1.5 text-xs ${msg === "저장되었습니다." ? "text-green-600" : "text-red-600"}`}>
            {msg}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-brew-muted">현재 플랜</span>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${planColor}`}
        >
          {plan}
        </span>
      </div>
    </div>
  );
}

export function MembersSection({
  members,
  currentUserId,
  currentUserRole,
}: {
  members: Member[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const [roleMsg, setRoleMsg] = useState<string | null>(null);
  const [removeMsg, setRemoveMsg] = useState<string | null>(null);
  const [rolePending, startRoleTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();

  const [invite, setInvite] = useState({ email: "", name: "", role: "BREWER" });
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [invitePending, startInviteTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const isOwner = currentUserRole === "OWNER";

  function handleRoleChange(userId: string, role: string) {
    setRoleMsg(null);
    startRoleTransition(async () => {
      try {
        await updateMemberRole(userId, role);
      } catch (e) {
        setRoleMsg(e instanceof Error ? e.message : "오류가 발생했습니다.");
      }
    });
  }

  function handleRemove(userId: string) {
    setRemoveMsg(null);
    startRemoveTransition(async () => {
      try {
        await removeMember(userId);
        setConfirmRemove(null);
      } catch (e) {
        setRemoveMsg(e instanceof Error ? e.message : "오류가 발생했습니다.");
        setConfirmRemove(null);
      }
    });
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteMsg(null);
    setTempPassword(null);
    startInviteTransition(async () => {
      try {
        const result = await inviteMember(invite);
        setTempPassword(result.tempPassword);
        setInvite({ email: "", name: "", role: "BREWER" });
      } catch (e) {
        setInviteMsg(e instanceof Error ? e.message : "오류가 발생했습니다.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Member list */}
      <div>
        <p className="text-xs font-semibold text-brew-subtle uppercase tracking-wide mb-3">멤버 목록</p>
        <div className="rounded-xl border border-brew-border bg-brew-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brew-border text-xs text-brew-subtle">
                <th className="px-4 py-2.5 text-left font-medium">이름</th>
                <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">이메일</th>
                <th className="px-4 py-2.5 text-left font-medium">역할</th>
                {isOwner && <th className="px-4 py-2.5 text-right font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-brew-border/50">
                  <td className="px-4 py-3 text-brew-text font-medium">
                    {m.name}
                    {m.id === currentUserId && (
                      <span className="ml-1.5 text-xs text-brew-subtle">(나)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brew-subtle text-xs hidden sm:table-cell">{m.email}</td>
                  <td className="px-4 py-3">
                    {isOwner && m.id !== currentUserId && m.role !== "OWNER" ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        disabled={rolePending}
                        className="rounded-md border border-brew-border bg-white px-2 py-1 text-xs text-brew-text focus:border-brew-accent focus:outline-none"
                      >
                        {Object.entries(ROLE_LABEL)
                          .filter(([k]) => k !== "OWNER")
                          .map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                      </select>
                    ) : (
                      <span className="text-xs text-brew-muted">{ROLE_LABEL[m.role] ?? m.role}</span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-right">
                      {m.id !== currentUserId && m.role !== "OWNER" && (
                        confirmRemove === m.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setConfirmRemove(null)}
                              className="text-xs text-brew-muted hover:text-brew-text"
                            >취소</button>
                            <button
                              onClick={() => handleRemove(m.id)}
                              disabled={removePending}
                              className="text-xs text-red-600 hover:text-red-800 font-semibold"
                            >확인</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemove(m.id)}
                            className="text-xs text-brew-subtle hover:text-red-500 transition-colors"
                          >제거</button>
                        )
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(roleMsg || removeMsg) && (
          <p className="mt-2 text-xs text-red-600">{roleMsg ?? removeMsg}</p>
        )}
      </div>

      {/* Invite */}
      {isOwner && (
        <div>
          <p className="text-xs font-semibold text-brew-subtle uppercase tracking-wide mb-3">멤버 초대</p>
          <form onSubmit={handleInvite} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-brew-muted mb-1">이름</label>
                <input
                  required
                  value={invite.name}
                  onChange={(e) => setInvite((f) => ({ ...f, name: e.target.value }))}
                  placeholder="홍길동"
                  className="w-full rounded-lg border border-brew-border bg-white px-3 py-2 text-sm focus:border-brew-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-brew-muted mb-1">이메일</label>
                <input
                  type="email"
                  required
                  value={invite.email}
                  onChange={(e) => setInvite((f) => ({ ...f, email: e.target.value }))}
                  placeholder="hong@example.com"
                  className="w-full rounded-lg border border-brew-border bg-white px-3 py-2 text-sm focus:border-brew-accent focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-brew-muted mb-1">역할</label>
              <select
                value={invite.role}
                onChange={(e) => setInvite((f) => ({ ...f, role: e.target.value }))}
                className="rounded-lg border border-brew-border bg-white px-3 py-2 text-sm focus:border-brew-accent focus:outline-none"
              >
                <option value="MANAGER">매니저</option>
                <option value="BREWER">양조사</option>
                <option value="VIEWER">뷰어</option>
              </select>
            </div>

            {inviteMsg && <p className="text-xs text-red-600">{inviteMsg}</p>}
            {tempPassword && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-xs text-green-800 mb-1">초대 완료! 임시 비밀번호를 공유해주세요:</p>
                <p className="font-mono font-bold text-green-900 text-sm">{tempPassword}</p>
                <p className="text-xs text-green-700 mt-1">첫 로그인 후 비밀번호를 변경하도록 안내해주세요.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={invitePending}
              className="self-start rounded-lg bg-brew-dark px-4 py-2.5 text-sm font-semibold text-brew-text-light hover:bg-brew-dark/80 transition-colors disabled:opacity-50"
            >
              {invitePending ? "초대 중..." : "초대하기"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
