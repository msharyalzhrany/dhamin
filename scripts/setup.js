// تهيئة أولى بأمر واحد:  npm run setup
// 1) ينشئ ملف .env ويولّد المفتاح السري  2) ينشئ جداول قاعدة البيانات
import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// نشتغل دائماً من جذر المشروع حتى لو الأمر انكتب من مكان ثاني (ويدعم المسارات اللي فيها مسافات)
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  const secret = randomBytes(32).toString('hex');
  writeFileSync('.env', readFileSync('.env', 'utf8').replace('BETTER_AUTH_SECRET=change-me', `BETTER_AUTH_SECRET=${secret}`));
  console.log('✅ تم إنشاء ملف .env مع مفتاح سري جديد');
} else {
  console.log('ℹ️  ملف .env موجود — ما غيّرت فيه شي');
}

mkdirSync('data', { recursive: true });

console.log('⏳ إنشاء جداول قاعدة البيانات...');
const r = spawnSync('npm', ['run', 'db:push'], { stdio: 'inherit', shell: true });
if (r.status !== 0) {
  console.error('\n❌ فشل إنشاء الجداول. راجع الرسالة أعلاه.');
  process.exit(r.status ?? 1);
}
console.log('\n✅ جاهز! شغّل المشروع بالأمر:  npm run dev');
