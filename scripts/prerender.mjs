import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = `${root}dist`;
const ssrBundle = `${root}dist-ssr/entry-server.js`;

const {
  APP_LANGUAGE_CODES,
  APP_LANGUAGES,
  renderHead,
  renderLanding,
  renderRobots,
  renderSitemap,
} = await import(ssrBundle);

const indexPath = `${dist}/index.html`;
const template = await readFile(indexPath, "utf8");

/*
  ตรวจว่าจุดที่จะแทนยังอยู่ครบก่อนแก้
  ถ้ามีใครลบ comment ใน index.html ไปแล้ว replace จะไม่ทำอะไรเงียบ ๆ
  แล้วได้เว็บที่ไม่มี SEO ขึ้นไปโดยไม่มีใครรู้ — ตายตอน build ดีกว่า
*/
const markers = [
  '<html lang="en">',
  "<!--seo-head-->",
  "<!--landing-->",
  "<title>",
];
for (const marker of markers) {
  if (!template.includes(marker)) {
    console.error(
      `prerender: ไม่พบ ${marker} ใน dist/index.html — ตรวจ index.html`,
    );
    process.exit(1);
  }
}

for (const language of APP_LANGUAGE_CODES) {
  // ส่งเป็นฟังก์ชัน เพราะ replace แบบ string จะตีความ $& หรือ $1 ในเนื้อหาเป็นคำสั่ง
  const html = template
    .replace('<html lang="en">', () => `<html lang="${language}">`)
    // title ตัวเดิมเป็นของตอน dev ถูกแทนด้วยตัวที่อยู่ใน renderHead แล้ว
    .replace(/<title>[\s\S]*?<\/title>\s*/, "")
    .replace("<!--seo-head-->", () => renderHead(language))
    .replace("<!--landing-->", () => renderLanding(language));

  const path = APP_LANGUAGES[language].landingPath;
  const file = path === "/" ? "index.html" : `${path.slice(1)}.html`;
  await writeFile(`${dist}/${file}`, html);
}

// วันที่แบบ YYYY-MM-DD ตามที่ sitemap กำหนด
const buildDate = new Date().toISOString().slice(0, 10);
await writeFile(`${dist}/robots.txt`, renderRobots());
await writeFile(`${dist}/sitemap.xml`, renderSitemap(buildDate));

// ไม่ต้องเก็บไว้ — Worker deploy แค่โฟลเดอร์ dist และอันนี้ใช้ครั้งเดียวตอน build
await rm(`${root}dist-ssr`, { recursive: true, force: true });

console.log(
  `prerender: เขียนหน้า landing (${APP_LANGUAGE_CODES.join(", ")}), robots.txt และ sitemap.xml ลง dist แล้ว`,
);
