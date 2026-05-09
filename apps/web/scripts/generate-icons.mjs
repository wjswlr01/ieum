// 1024 원본 PNG에서 favicon/PWA/iOS 홈스크린용 아이콘 일괄 생성
// 실행: node scripts/generate-icons.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const SRC = path.join(PUBLIC_DIR, "icon-1024.png");

const TARGETS = [
  { out: "icon-192.png", size: 192 },
  { out: "icon-512.png", size: 512 },
  { out: "apple-touch-icon.png", size: 180 },
];

async function makePng(size, outPath) {
  await sharp(SRC)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${path.basename(outPath)} (${size}×${size})`);
}

// favicon.ico — 32×32 단일 프레임 PNG를 .ico 컨테이너로 패킹
async function makeIco(outPath) {
  const size = 32;
  const png = await sharp(SRC).resize(size, size, { fit: "cover" }).png().toBuffer();
  // ICO 헤더(6) + 디렉토리 엔트리(16) + PNG 데이터
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(1, 4); // image count
  const dir = Buffer.alloc(16);
  dir.writeUInt8(size === 256 ? 0 : size, 0); // width (0 == 256)
  dir.writeUInt8(size === 256 ? 0 : size, 1); // height
  dir.writeUInt8(0, 2);  // color palette
  dir.writeUInt8(0, 3);  // reserved
  dir.writeUInt16LE(1, 4); // color planes
  dir.writeUInt16LE(32, 6); // bits per pixel
  dir.writeUInt32LE(png.length, 8); // image size
  dir.writeUInt32LE(6 + 16, 12); // offset to image data
  await writeFile(outPath, Buffer.concat([header, dir, png]));
  console.log(`✓ ${path.basename(outPath)} (${size}×${size}, ICO)`);
}

await readFile(SRC); // 원본 존재 확인 (없으면 throw)

for (const t of TARGETS) {
  await makePng(t.size, path.join(PUBLIC_DIR, t.out));
}
await makeIco(path.join(PUBLIC_DIR, "favicon.ico"));

console.log("done");
