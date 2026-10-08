// رافع الصور: سحب وإفلات أو نقر، تقدّم الرفع، معاينة، الأولى = الغلاف، ترتيب بأزرار ◀ ▶ وحذف
import { useRef, useState, type DragEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ImagePlus, RotateCcw, Star, X } from 'lucide-react';
import { usePrefs } from '@/providers/prefs';
import { useToast } from '@/providers/toast';
import { cn } from '@/lib/utils';

export type Img = { id: string; url?: string; preview: string; status: 'uploading' | 'done' | 'error'; progress: number; error?: string; file?: File };
export const MAX_IMAGES = 10;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** رفع ملف واحد بـ XHR لنعرف نسبة التقدّم (fetch لا يعطي تقدّم الرفع) */
export function uploadFile(file: File, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    const x = new XMLHttpRequest();
    x.open('POST', '/api/uploads');
    x.withCredentials = true;
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => {
      let j: any = null;
      try { j = JSON.parse(x.responseText); } catch { /* ignore */ }
      if (x.status >= 200 && x.status < 300 && j?.url) resolve(j.url);
      else reject(Object.assign(new Error(j?.error?.message ?? 'upload failed'), { code: j?.error?.code ?? 'ERROR' }));
    };
    x.onerror = () => reject(Object.assign(new Error('network'), { code: 'NETWORK' }));
    x.send(fd);
  });
}

export function PhotoUploader({ images, onChange }: { images: Img[]; onChange: (fn: (prev: Img[]) => Img[]) => void }) {
  const { t, num } = usePrefs();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const msgFor = (code: string, fallback: string) =>
    code === 'TOO_LARGE' ? t('الحجم أكبر من 5 ميجا', 'File is larger than 5MB')
      : code === 'BAD_FILE' ? t('صيغة غير مدعومة (JPG/PNG/WebP)', 'Unsupported format (JPG/PNG/WebP)')
      : code === 'NETWORK' ? t('تعذّر الاتصال', 'Network error') : fallback;

  function start(img: Img) {
    onChange((p) => p.map((i) => (i.id === img.id ? { ...i, status: 'uploading', progress: 0, error: undefined } : i)));
    uploadFile(img.file!, (progress) => onChange((p) => p.map((i) => (i.id === img.id ? { ...i, progress } : i))))
      .then((url) => onChange((p) => p.map((i) => (i.id === img.id ? { ...i, url, status: 'done', progress: 100, file: undefined } : i))))
      .catch((e) => onChange((p) => p.map((i) => (i.id === img.id ? { ...i, status: 'error', error: msgFor(e.code, e.message) } : i))));
  }

  function add(files: FileList | File[]) {
    const arr = Array.from(files);
    const room = MAX_IMAGES - images.length;
    if (arr.length > room) toast(t(`الحد الأقصى ${num(MAX_IMAGES)} صور`, `Maximum ${num(MAX_IMAGES)} photos`), 'err');
    const fresh: Img[] = [];
    for (const f of arr.slice(0, Math.max(0, room))) {
      if (!OK_TYPES.includes(f.type)) { toast(`${f.name}: ${t('صيغة غير مدعومة (JPG/PNG/WebP)', 'Unsupported format (JPG/PNG/WebP)')}`, 'err'); continue; }
      if (f.size > 5 * 1024 * 1024) { toast(`${f.name}: ${t('الحجم أكبر من 5 ميجا', 'File is larger than 5MB')}`, 'err'); continue; }
      fresh.push({ id: crypto.randomUUID(), preview: URL.createObjectURL(f), status: 'uploading', progress: 0, file: f });
    }
    if (!fresh.length) return;
    onChange((p) => [...p, ...fresh]);
    fresh.forEach(start);
  }

  const move = (i: number, d: -1 | 1) => onChange((p) => { const a = [...p]; const j = i + d; if (j < 0 || j >= a.length) return p; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const remove = (id: string) => onChange((p) => p.filter((i) => i.id !== id));
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
        className={cn('flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center transition-colors', over ? 'border-brand bg-brand-soft' : 'border-line bg-surface-2/50')}>
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-text"><ImagePlus className="size-7" /></span>
        <div>
          <p className="font-semibold">{t('اسحب الصور وأفلتها هنا', 'Drag & drop photos here')}</p>
          <p className="mt-1 text-xs text-muted">{t(`حتى ${num(MAX_IMAGES)} صور · JPG أو PNG أو WebP · 5 ميجا لكل صورة`, `Up to ${num(MAX_IMAGES)} photos · JPG, PNG or WebP · 5MB each`)}</p>
        </div>
        <button type="button" onClick={() => input.current?.click()} disabled={images.length >= MAX_IMAGES}
          className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition hover:brightness-110 disabled:opacity-50">{t('اختر من جهازك', 'Choose files')}</button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label={t('رفع صور العقار', 'Upload property photos')}
          onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ''; }} />
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <AnimatePresence initial={false}>
            {images.map((img, i) => (
              <motion.li key={img.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="relative overflow-hidden rounded-2xl border border-line bg-surface-2">
                <div className="aspect-[4/3]"><img src={img.preview} alt={t(`صورة ${num(i + 1)}`, `Photo ${num(i + 1)}`)} className="size-full object-cover" /></div>
                {i === 0 && <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[0.7rem] font-bold text-on-brand"><Star className="size-3" />{t('الغلاف', 'Cover')}</span>}
                <button type="button" onClick={() => remove(img.id)} aria-label={t('حذف الصورة', 'Remove photo')} className="absolute end-2 top-2 grid size-9 place-items-center rounded-full bg-deep/80 text-white backdrop-blur hover:bg-deep"><X className="size-4" /></button>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-deep/80 to-transparent p-2">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('تحريك للأمام', 'Move earlier')} className="grid size-9 place-items-center rounded-full bg-surface/90 text-ink disabled:opacity-40"><ChevronRight className="size-4 ltr:rotate-180" /></button>
                  <button type="button" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label={t('تحريك للخلف', 'Move later')} className="grid size-9 place-items-center rounded-full bg-surface/90 text-ink disabled:opacity-40"><ChevronLeft className="size-4 ltr:rotate-180" /></button>
                </div>
                {img.status === 'uploading' && (
                  <div className="absolute inset-0 grid place-items-center bg-deep/55 text-white" role="progressbar" aria-valuenow={img.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="w-3/4"><p className="num mb-1 text-center text-sm font-bold">{img.progress}%</p><div className="h-1.5 overflow-hidden rounded-full bg-white/30"><div className="h-full bg-brand transition-all" style={{ width: `${img.progress}%` }} /></div></div>
                  </div>
                )}
                {img.status === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-deep/80 p-2 text-center text-white">
                    <p className="text-xs font-semibold">{img.error}</p>
                    {img.file && <button type="button" onClick={() => start(img)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-deep"><RotateCcw className="size-3.5" />{t('إعادة', 'Retry')}</button>}
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {images.length > 1 && <p className="text-xs text-muted">{t('الصورة الأولى هي غلاف الإعلان. استخدم الأسهم لإعادة الترتيب.', 'The first photo is the listing cover. Use the arrows to reorder.')}</p>}
    </div>
  );
}
