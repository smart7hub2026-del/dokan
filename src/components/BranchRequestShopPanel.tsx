import { useState, useRef } from 'react';
import { Building2, Send, ImagePlus, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { apiPostShopBranchRequest } from '../services/api';
import { useToast } from './Toast';

const MAX_IMAGE_CHARS = 450_000;

export default function BranchRequestShopPanel() {
  const { isDark } = useApp();
  const authToken = useStore((s) => s.authToken);
  const shopCode = useStore((s) => s.shopCode);
  const { success, error } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [branchTitle, setBranchTitle] = useState('');
  const [message, setMessage] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [credNote, setCredNote] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');

  const panel =
    isDark ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50';
  const input =
    isDark
      ? 'bg-slate-800/60 border-slate-600 text-white placeholder:text-slate-500'
      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';

  const onPickImage = (f: File | null) => {
    if (!f || !f.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      if (s.length > MAX_IMAGE_CHARS) {
        error('تصویر بزرگ است', 'عکس کوچک‌تر یا فشرده‌تر انتخاب کنید');
        return;
      }
      setImageDataUrl(s);
    };
    r.readAsDataURL(f);
  };

  const submit = async () => {
    const msg = message.trim();
    if (msg.length < 10) {
      error('متن ناقص است', 'حداقل ۱۰ نویسه توضیح بنویسید');
      return;
    }
    setBusy(true);
    try {
      await apiPostShopBranchRequest(
        {
          message: msg,
          branch_title: branchTitle.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
          proposed_credentials_note: credNote.trim() || undefined,
          image_data_url: imageDataUrl || undefined,
        },
        authToken || undefined,
      );
      success('ارسال شد', 'درخواست شما نزد ابرادمین ثبت شد؛ پس از بررسی با شما هماهنگ می‌شود.');
      setOpen(false);
      setBranchTitle('');
      setMessage('');
      setContactPhone('');
      setCredNote('');
      setImageDataUrl('');
    } catch (e) {
      error('خطا', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${panel}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Building2 className="text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>درخواست شعبهٔ جدید</h3>
            <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              برای ایجاد فروشگاه / شعبهٔ جدا زیر پلتفرم، جزئیات را بنویسید. ابرادمین در پنل مادر درخواست را می‌بیند و پس از
              تأیید، کد فروشگاه جدید طبق فرایند داخلی صادر می‌شود. دکان فعلی شما:{' '}
              <span className="font-mono font-bold" dir="ltr">
                {shopCode || '—'}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold bg-amber-600 text-white hover:bg-amber-500"
        >
          {open ? 'بستن فرم' : 'ثبت درخواست'}
        </button>
      </div>

      {open && (
        <div className={`space-y-3 pt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <input
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-amber-500 ${input}`}
            placeholder="عنوان پیشنهادی شعبه (مثلاً شعبهٔ هرات)"
            value={branchTitle}
            onChange={(e) => setBranchTitle(e.target.value)}
          />
          <textarea
            className={`w-full rounded-xl border px-3 py-2 text-sm min-h-[100px] outline-none focus:border-amber-500 ${input}`}
            placeholder="توضیح کامل درخواست: آدرس، دلیل، تعداد کاربر، … (الزامی)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <input
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-amber-500 ${input}`}
            placeholder="شماره تماس پیگیری (اختیاری)"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            dir="ltr"
          />
          <textarea
            className={`w-full rounded-xl border px-3 py-2 text-sm min-h-[72px] outline-none focus:border-amber-500 ${input}`}
            placeholder="یادداشت رمز / نام کاربری پیشنهادی برای شعبهٔ جدید (اختیاری — فقط برای ابرادمین دیده می‌شود)"
            value={credNote}
            onChange={(e) => setCredNote(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0] || null)} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-xs font-bold text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
            >
              <ImagePlus size={14} />
              {imageDataUrl ? 'تعویض تصویر' : 'پیوست تصویر (اختیاری)'}
            </button>
            {imageDataUrl ? (
              <button type="button" className="text-xs text-rose-500 font-bold" onClick={() => setImageDataUrl('')}>
                حذف تصویر
              </button>
            ) : null}
          </div>
          {imageDataUrl ? (
            <img src={imageDataUrl} alt="" className="max-h-32 rounded-lg border border-white/10 object-contain" />
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-bold hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            ارسال و انتظار برای تأیید
          </button>
        </div>
      )}
    </div>
  );
}
