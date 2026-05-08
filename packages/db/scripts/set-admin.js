/**
 * 특정 이메일 계정을 ADMIN으로 승격
 * 실행: node packages/db/scripts/set-admin.js [email]
 *       이메일 미지정 시 기본값: wjswlr01@gmail.com
 */

const fs = require("fs");
const envPath = require("path").join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  });
}

const { PrismaClient } = require("../generated");
const db = new PrismaClient();

async function main() {
  const rawEmail = process.argv[2] ?? "wjswlr01@gmail.com";
  const email = rawEmail.trim().toLowerCase();

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`[set-admin] 해당 이메일을 찾을 수 없습니다: ${email}`);
    process.exit(1);
  }

  if (user.isAdmin) {
    console.log(`[set-admin] 이미 ADMIN입니다: ${email}`);
    return;
  }

  await db.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
  });

  console.log(`[set-admin] ✅ ADMIN 승격 완료: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
