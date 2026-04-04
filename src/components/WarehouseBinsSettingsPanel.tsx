import { useState } from 'react';
import { Warehouse, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

/** مدیریت سطل‌های انبار در تنظیمات عمومی (مدیر) — حذف فقط با تأیید و در صورت خالی بودن موجودی */
export default function WarehouseBinsSettingsPanel() {
  const { isDark } = useApp();
  const { success, error } = useToast();
  const warehouses = useStore((s) => s.warehouses);
  const addWarehouse = useStore((s) => s.addWarehouse);
  const removeWarehouse = useStore((s) => s.removeWarehouse);
  const getWarehouseBinStockTotal = useStore((s) => s.getWarehouseBinStockTotal);
  const [newName, setNewName] = useState('');

  const card = isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const label = isDark ? 'text-slate-400' : 'text-slate-600';
  const title = isDark ? 'text-white' : 'text-slate-900';

  return (
    <div className={`rounded-2xl border p-6 space-y-4 ${card}`}>
      <div className="flex items-start gap-3">
        <div
          className={`rounded-xl p-2.5 ${isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-800'}`}
        >
          <Warehouse size={22} />
        </div>
        <div>
          <h2 className={`font-semibold ${title}`}>انبارها (تنظیمات پیشرفته)</h2>
          <p className={`text-xs mt-1 leading-relaxed ${label}`}>
            لیست سطل‌های انبار با فروشگاه همگام می‌شود. حذف فقط پس از تأیید شما انجام می‌شود؛ اگر در آن انبار کالایی ثبت شده باشد، حذف مسدود است.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="نام انبار جدید"
          className={`min-w-[160px] flex-1 rounded-xl border px-3 py-2.5 text-sm ${
            isDark ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        />
        <button
          type="button"
          onClick={() => {
            const n = newName.trim();
            if (!n) return;
            addWarehouse(n);
            setNewName('');
            success('انبار اضافه شد', n);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-sm font-medium"
        >
          <Plus size={16} /> افزودن
        </button>
      </div>

      <ul className="space-y-2">
        {warehouses.map((w) => {
          const qty = getWarehouseBinStockTotal(w.id);
          return (
            <li
              key={w.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                isDark ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-slate-50/80'
              }`}
            >
              <div>
                <span className={isDark ? 'text-white font-medium' : 'text-slate-900 font-medium'}>{w.name}</span>
                <span className={`text-xs mr-2 ${label}`}>
                  — موجودی ثبت‌شده: {qty.toLocaleString('fa-IR')} عدد
                  {w.id === 1 ? ' (انبار پیش‌فرض؛ غیرقابل حذف)' : ''}
                </span>
              </div>
              {w.id !== 1 ? (
                <button
                  type="button"
                  title="حذف انبار"
                  onClick={() => {
                    if (qty > 0) {
                      error(
                        'حذف ممکن نیست',
                        `در «${w.name}» کالا ثبت شده است (${qty.toLocaleString('fa-IR')} عدد). ابتدا موجودی را منتقل یا تعدیل کنید.`
                      );
                      return;
                    }
                    if (!window.confirm(`انبار «${w.name}» حذف شود؟ این کار برگشت‌پذیر نیست.`)) return;
                    removeWarehouse(w.id);
                    success('حذف شد', w.name);
                  }}
                  className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
