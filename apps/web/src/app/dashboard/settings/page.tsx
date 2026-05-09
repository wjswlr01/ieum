import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ProfileSection } from "./profile-section";
import { TenantSection, MembersSection } from "./members-section";
import { PreferencesSection, NotificationsSection, AccountSection } from "./account-section";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-brew-border bg-brew-surface p-6">
      <h2 className="text-base font-semibold text-brew-text mb-5">{title}</h2>
      {children}
    </section>
  );
}

function Divider() {
  return <hr className="border-brew-border my-1" />;
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [user, tenant, members] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, role: true },
    }),
    db.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { id: true, name: true },
    }),
    db.user.findMany({
      where: { tenantId: session.user.tenantId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!user || !tenant) redirect("/dashboard");

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-xl md:text-2xl font-bold mb-8">계정 설정</h1>

      <div className="flex flex-col gap-6">
        <SectionCard title="프로필">
          <ProfileSection initialName={user.name ?? ""} email={user.email ?? ""} />
        </SectionCard>

        <SectionCard title="양조장">
          <div className="flex flex-col gap-6">
            <TenantSection initialName={tenant.name} />
            <Divider />
            <MembersSection
              members={members}
              currentUserId={user.id}
              currentUserRole={user.role}
            />
          </div>
        </SectionCard>

        <SectionCard title="기본 설정">
          <PreferencesSection />
        </SectionCard>

        <SectionCard title="알림">
          <NotificationsSection />
        </SectionCard>

        <SectionCard title="계정">
          <AccountSection />
        </SectionCard>
      </div>
    </main>
  );
}
