// يجلب صوراً حرة الترخيص لجدة من Wikimedia Commons ويضعها في public/img/listings/<النوع>/
// التشغيل (على جهازك، يحتاج إنترنت):  npm run photos
// ملاحظة: Commons فيها مبانٍ وشوارع وأحياء جدة، ونادراً صور داخلية للشقق. أضف الداخلية بنفسك.
// يكتب ملف CREDITS.md بأسماء المصورين والتراخيص (مطلوب قانونياً عند النشر).
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../public/img/listings/', import.meta.url));
const PER_TYPE = 8;
const QUERIES = {
  villa: ['Jeddah villa', 'Jeddah house', 'Jeddah residential street'],
  apartment: ['Jeddah apartment building', 'Jeddah residential tower', 'Jeddah apartments'],
  land: ['Jeddah land', 'Jeddah desert outskirts', 'Jeddah construction site'],
  building: ['Jeddah building', 'Jeddah tower', 'Jeddah Al Hamra building'],
  shop: ['Jeddah souq', 'Jeddah Balad shops', 'Jeddah market street'],
  office: ['Jeddah office tower', 'Jeddah business district', 'Jeddah skyline'],
};
const H = { 'user-agent': 'DhaminStudentProject/1.0 (CS379 course project)' };
const clean = (s = '') => s.replace(/<[^>]+>/g, '').trim();

async function search(q) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({ action: 'query', format: 'json', generator: 'search', gsrnamespace: 6, gsrsearch: `${q} filetype:bitmap`, gsrlimit: 30, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: 1600 })
    .forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await (await fetch(u, { headers: H })).json();
  return Object.values(j.query?.pages ?? {}).map((p) => ({ title: p.title, ...p.imageinfo?.[0] })).filter((x) => x.mime === 'image/jpeg' && x.width >= 1400 && x.height >= 800 && x.thumburl);
}

const credits = ['# Credits — Wikimedia Commons\n'];
for (const [type, qs] of Object.entries(QUERIES)) {
  await mkdir(`${ROOT}${type}`, { recursive: true });
  const seen = new Set(); const picked = [];
  for (const q of qs) for (const r of await search(q)) { if (!seen.has(r.title) && picked.length < PER_TYPE) { seen.add(r.title); picked.push(r); } }
  let n = 0;
  for (const r of picked) {
    try {
      const buf = Buffer.from(await (await fetch(r.thumburl, { headers: H })).arrayBuffer());
      n++; const file = `${String(n).padStart(2, '0')}-${type}.jpg`;
      await writeFile(`${ROOT}${type}/${file}`, buf);
      const m = r.extmetadata ?? {};
      credits.push(`- ${type}/${file} — ${r.title} — ${clean(m.Artist?.value)} — ${clean(m.LicenseShortName?.value)} — ${r.descriptionurl}`);
    } catch (e) { console.log('skip', r.title, e.message); }
  }
  console.log(`${type}: ${n} صور`);
}
await writeFile(`${ROOT}CREDITS.md`, credits.join('\n') + '\n');
console.log('تم. راجع الصور ثم احذف غير المناسب منها، وبعدها: npm run db:seed -- --reset');
