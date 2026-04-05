import { Trash2, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStore, type TrashEntry } from '../store/useStore';
import { useToast } from './Toast';

const kindLabel: Record<TrashEntry['kind'], string> = {
  product: 'کالا',
  supplier: 'تأمین‌کننده',
  customer: 'مشتری',
};

export default function TrashPage() {
  const { isDark } = useApp();
  const { success } = useToast();
  const trash = useStore((s) => s.trash);
  const restoreTrashEntry = useStore((s) => s.restoreTrashEntry);
  const purgeTrashEntry = useStore((s) => s.purgeTrashEntry);
  const currentUser = useStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return <p className="text-slate-400 text-sm">فقط مدیر فروشگاه به سطل زباله دسترسی دارد.</p>;
  }

  const card = isDark
    ? 'rounded-2xl border border-white/10 bg-slate-900/50 p-4'
    : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';

  return (
    <div className="space-y-4 fade-in">
      <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        مواردی که <strong className={isDark ? 'text-white' : 'text-slate-900'}>مدیر</strong> حذف می‌کند اینجا نگه داشته می‌شود تا در صورت نیاز بازیابی شوند. حذف یا ویرایش توسط
        فروشنده، انباردار یا حسابدار بدون تأیید مدیر اعمال نمی‌شود و در «تأیید فعالیت» می‌آید.
      </p>
      {trash.length === 0 ? (
        <div className={`${card} text-center py-12 text-slate-500 text-sm`}>سطل زباله خالی است.</div>
      ) : (
        <ul className="space-y-2">
          {trash.map((t) => {
            const snap = t.snapshot as { name?: string; title?: string; company_name?: string };
            const title = snap.name || snap.title || snap.company_name || `#${t.kind}`;
            return (
              <li key={t.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-indigo-400 uppercase">{kindLabel[t.kind]}</span>
                  <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</p>
                  <p className="text-[11px] text-slate-500">{new Date(t.deleted_at).toLocaleString('fa-IR')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      restoreTrashEntry(t.id);
                      success('بازیابی', 'مورد به لیست اصلی برگردانده شد.');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    <RotateCcw size={14} /> بازیابی
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      purgeTrashEntry(t.id);
                      success('حذف دائم', 'از سطل زباله پاک شد.');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 size={14} /> حذف دائم
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
