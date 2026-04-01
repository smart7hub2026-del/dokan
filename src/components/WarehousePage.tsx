import { useMemo, useState } from 'react';
import { Warehouse, ArrowDownToLine, ArrowUpFromLine, Search, Package, Plus, Trash2, Mic, MicOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import FormModal from './ui/FormModal';
import { useToast } from './Toast';
import type { Product } from '../data/mockData';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { bookToProductForSale } from '../utils/bookInventory';

export default function WarehousePage() {
  const { t, formatPrice, isDark } = useApp();
  const { success, error } = useToast();
  const products = useStore(s => s.products);
  const books = useStore(s => s.books);
  const shopSettings = useStore(s => s.shopSettings);
  const updateProduct = useStore(s => s.updateProduct);
  const updateBook = useStore(s => s.updateBook);
  const warehouses = useStore(s => s.warehouses);
  const addWarehouse = useStore(s => s.addWarehouse);
  const removeWarehouse = useStore(s => s.removeWarehouse);
  const currentUser = useStore(s => s.currentUser);
  const addPendingApproval = useStore(s => s.addPendingApproval);
  const reportStaffActivityToAdmins = useStore(s => s.reportStaffActivityToAdmins);
  const [search, setSearch] = useState('');
  const [moveTarget, setMoveTarget] = useState<{ product: Product; direction: 'to_shop' | 'to_warehouse' } | null>(null);
  const [moveQty, setMoveQty] = useState('');
  const [newBinName, setNewBinName] = useState('');

  const { isListening, startListening, stopListening, supported: voiceOk } = useVoiceSearch((text) => {
    setSearch(text);
  });

  const catalogProducts = useMemo((): Product[] => {
    if (shopSettings.business_type === 'bookstore') {
      return books.filter((b) => b.is_active).map(bookToProductForSale);
    }
    return products;
  }, [shopSettings.business_type, books, products]);

  const rows = useMemo(() => {
    const q = search.trim();
    return catalogProducts
      .filter(p => p.is_active)
      .filter(p => !q || p.name.includes(q) || p.product_code.includes(q) || (p.barcode && p.barcode.includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, [catalogProducts, search]);

  const confirmMove = () => {
    if (!moveTarget) return;
    const { product, direction } = moveTarget;
    const n = Math.floor(Number(moveQty));
    if (!n || n < 1) {
      error('خطا', 'تعداد معتبر وارد کنید');
      return;
    }
    if (direction === 'to_shop') {
      if (n > product.stock_warehouse) {
        error('خطا', 'موجودی انبار کافی نیست');
        return;
      }
    } else if (n > product.stock_shop) {
      error('خطا', 'موجودی مغازه کافی نیست');
      return;
    }

    if (currentUser?.role === 'admin') {
      if (shopSettings.business_type === 'bookstore') {
        const b = books.find((x) => x.id === product.id);
        if (b) {
          if (direction === 'to_shop') {
            updateBook({
              ...b,
              stock_warehouse: b.stock_warehouse - n,
              stock_shop: b.stock_shop + n,
            });
          } else {
            updateBook({
              ...b,
              stock_shop: b.stock_shop - n,
              stock_warehouse: b.stock_warehouse + n,
            });
          }
        }
      } else if (direction === 'to_shop') {
        updateProduct({
          ...product,
          stock_warehouse: product.stock_warehouse - n,
          stock_shop: product.stock_shop + n,
        });
      } else {
        updateProduct({
          ...product,
          stock_shop: product.stock_shop - n,
          stock_warehouse: product.stock_warehouse + n,
        });
      }
      success(
        'انتقال انجام شد',
        direction === 'to_shop' ? `${n} واحد از انبار به مغازه` : `${n} واحد از مغازه به انبار`
      );
    } else {
      addPendingApproval({
        type: 'warehouse_transfer',
        title:
          direction === 'to_shop'
            ? `انتقال به مغازه: ${product.name}`
            : `انتقال به انبار: ${product.name}`,
        description:
          direction === 'to_shop'
            ? `${n} واحد از انبار به مغازه`
            : `${n} واحد از مغازه به انبار`,
        data: {
          product_id: product.id,
          product_name: product.name,
          quantity: n,
          direction,
        },
        submitted_by: currentUser?.full_name || 'کاربر',
        submitted_by_role: currentUser?.role || '',
      });
      reportStaffActivityToAdmins(
        direction === 'to_shop' ? 'درخواست انتقال انبار → مغازه' : 'درخواست انتقال مغازه → انبار',
        `${currentUser?.full_name}: ${n} عدد «${product.name}» — ${direction === 'to_shop' ? 'به مغازه' : 'به انبار'}.`,
        currentUser?.id ?? 0,
        currentUser?.full_name || 'کاربر'
      );
      success('ارسال شد', 'تا تأیید مدیر در «تأیید فعالیت»، موجودی تغییر نمی‌کند.');
    }
    setMoveTarget(null);
    setMoveQty('');
  };

  const handleAddWarehouse = () => {
    const name = newBinName.trim();
    if (!name) {
      error('خطا', 'نام انبار را وارد کنید');
      return;
    }
    addWarehouse(name);
    setNewBinName('');
    success('انبار اضافه شد', name);
  };

  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-600';
  const panelClass = isDark ? 'border-white/10 glass' : 'border-slate-200 bg-white shadow-sm';

  return (
    <div className="space-y-6 fade-in" dir="rtl">
      <div>
        <h1 className={`text-2xl font-bold flex items-center gap-2 ${textMain}`}>
          <Warehouse size={26} className="text-amber-400 shrink-0" />
          {t('warehouse_page')}
        </h1>
        <p className={`${textSub} text-sm mt-1 max-w-2xl`}>{t('warehouse_subtitle')}</p>
      </div>

      <div className={`rounded-2xl border p-4 space-y-3 ${panelClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
          <div>
            <h2 className={`text-sm font-bold ${textMain}`}>انباربندی (چند انبار)</h2>
            <p className={`text-xs mt-0.5 ${textSub}`}>
              نام انبارها برای سازمان‌دهی است؛ موجودی کل همان ستون «انبار» در کالاهاست.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={newBinName}
              onChange={e => setNewBinName(e.target.value)}
              placeholder="نام انبار جدید"
              className={`min-w-[160px] flex-1 sm:flex-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 ${
                isDark ? 'bg-slate-800/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
            <button
              type="button"
              onClick={handleAddWarehouse}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold bg-amber-600 text-white hover:bg-amber-500"
            >
              <Plus size={14} /> افزودن انبار
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {warehouses.map(w => (
            <span
              key={w.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                isDark ? 'bg-slate-800/80 border-white/10 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              {w.name}
              {w.id !== 1 && (
                <button
                  type="button"
                  title="حذف"
                  onClick={() => {
                    removeWarehouse(w.id);
                    success('حذف شد', w.name);
                  }}
                  className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('search_product')}
          className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm outline-none focus:border-indigo-500 ${
            voiceOk ? 'pl-11' : ''
          } ${isDark ? 'bg-slate-800/50 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
        />
        {voiceOk && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`}
            title="جستجوی صوتی"
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
      </div>

      <div className={`rounded-2xl border overflow-hidden ${panelClass}`}>
        {/* دسکتاپ: جدول */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className={isDark ? 'bg-slate-800/60 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}>
                {['کالا', 'کد', 'موجودی انبار', 'مغازه', 'حداقل', 'انتقال'].map(h => (
                  <th key={h || 'a'} className={`text-right py-3 px-3 font-medium ${textSub} text-xs`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Package className={`mx-auto mb-2 opacity-30 ${textSub}`} size={40} />
                    <p className={textSub}>کالایی برای نمایش نیست</p>
                  </td>
                </tr>
              ) : (
                rows.map(p => (
                  <tr key={p.id} className={isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/80'}>
                    <td className={`py-3 px-3 font-medium ${textMain} max-w-[200px]`}>
                      <span className="line-clamp-2">{p.name}</span>
                      <span className={`block text-[11px] ${textSub}`}>{p.category_name}</span>
                    </td>
                    <td className={`py-3 px-3 font-mono text-xs ${textSub}`} dir="ltr">
                      {p.product_code}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-amber-400 font-bold tabular-nums">{p.stock_warehouse}</span>
                    </td>
                    <td className={`py-3 px-3 tabular-nums ${textSub}`}>{p.stock_shop}</td>
                    <td className={`py-3 px-3 tabular-nums ${textSub}`}>{p.min_stock}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 justify-end">
                        <button
                          type="button"
                          disabled={p.stock_warehouse <= 0}
                          onClick={() => {
                            setMoveTarget({ product: p, direction: 'to_shop' });
                            setMoveQty(String(Math.min(1, p.stock_warehouse) || 1));
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <ArrowDownToLine size={13} />
                          به مغازه
                        </button>
                        <button
                          type="button"
                          disabled={p.stock_shop <= 0}
                          onClick={() => {
                            setMoveTarget({ product: p, direction: 'to_warehouse' });
                            setMoveQty(String(Math.min(1, p.stock_shop) || 1));
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold bg-cyan-700 text-white hover:bg-cyan-600 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <ArrowUpFromLine size={13} />
                          به انبار
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* موبایل: کارت */}
        <div className={`md:hidden ${isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-200'}`}>
          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <Package className={`mx-auto mb-2 opacity-30 ${textSub}`} size={40} />
              <p className={textSub}>کالایی برای نمایش نیست</p>
            </div>
          ) : (
            rows.map(p => (
              <div
                key={p.id}
                className={`p-4 space-y-2 ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50/50'}`}
              >
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`font-bold text-sm ${textMain} line-clamp-2`}>{p.name}</p>
                    <p className={`text-[11px] ${textSub}`}>{p.category_name}</p>
                  </div>
                  <span className={`font-mono text-[10px] shrink-0 ${textSub}`} dir="ltr">
                    {p.product_code}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className={`rounded-lg py-2 ${isDark ? 'bg-slate-800/60' : 'bg-white border border-slate-100'}`}>
                    <span className={textSub}>انبار</span>
                    <p className="text-amber-400 font-black tabular-nums">{p.stock_warehouse}</p>
                  </div>
                  <div className={`rounded-lg py-2 ${isDark ? 'bg-slate-800/60' : 'bg-white border border-slate-100'}`}>
                    <span className={textSub}>مغازه</span>
                    <p className={`font-bold tabular-nums ${textMain}`}>{p.stock_shop}</p>
                  </div>
                  <div className={`rounded-lg py-2 ${isDark ? 'bg-slate-800/60' : 'bg-white border border-slate-100'}`}>
                    <span className={textSub}>حداقل</span>
                    <p className={`font-bold tabular-nums ${textSub}`}>{p.min_stock}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={p.stock_warehouse <= 0}
                    onClick={() => {
                      setMoveTarget({ product: p, direction: 'to_shop' });
                      setMoveQty(String(Math.min(1, p.stock_warehouse) || 1));
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-xl py-2.5 text-[11px] font-bold bg-indigo-600 text-white disabled:opacity-40"
                  >
                    <ArrowDownToLine size={14} />
                    به مغازه
                  </button>
                  <button
                    type="button"
                    disabled={p.stock_shop <= 0}
                    onClick={() => {
                      setMoveTarget({ product: p, direction: 'to_warehouse' });
                      setMoveQty(String(Math.min(1, p.stock_shop) || 1));
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-xl py-2.5 text-[11px] font-bold bg-cyan-700 text-white disabled:opacity-40"
                  >
                    <ArrowUpFromLine size={14} />
                    به انبار
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <FormModal
        open={!!moveTarget}
        onClose={() => {
          setMoveTarget(null);
          setMoveQty('');
        }}
        title={
          moveTarget
            ? moveTarget.direction === 'to_shop'
              ? `انبار → مغازه — ${moveTarget.product.name}`
              : `مغازه → انبار — ${moveTarget.product.name}`
            : ''
        }
        size="sm"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirmMove}
              className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-bold"
            >
              تأیید انتقال
            </button>
            <button
              type="button"
              onClick={() => {
                setMoveTarget(null);
                setMoveQty('');
              }}
              className={`flex-1 rounded-xl border py-2.5 text-sm ${
                isDark ? 'border-white/10 text-slate-400 glass' : 'border-slate-200 text-slate-600 bg-slate-50'
              }`}
            >
              انصراف
            </button>
          </div>
        }
      >
        {moveTarget ? (
          <div className="space-y-4 text-right">
            <p className={`text-xs ${textSub}`}>
              {moveTarget.direction === 'to_shop' ? (
                <>
                  موجودی انبار:{' '}
                  <strong className={isDark ? 'text-amber-300' : 'text-amber-700'}>{moveTarget.product.stock_warehouse}</strong>
                  {' — '}مغازه: {moveTarget.product.stock_shop}
                </>
              ) : (
                <>
                  موجودی مغازه:{' '}
                  <strong className={isDark ? 'text-cyan-300' : 'text-cyan-800'}>{moveTarget.product.stock_shop}</strong>
                  {' — '}انبار: {moveTarget.product.stock_warehouse}
                </>
              )}
              {' — '}
              قیمت فروش: {formatPrice(moveTarget.product.sale_price)}
            </p>
            <div>
              <label className={`${textSub} text-xs block mb-1`}>
                {moveTarget.direction === 'to_shop' ? 'تعداد انتقال به مغازه' : 'تعداد انتقال به انبار'}
              </label>
              <input
                type="number"
                min={1}
                max={
                  moveTarget.direction === 'to_shop'
                    ? moveTarget.product.stock_warehouse
                    : moveTarget.product.stock_shop
                }
                value={moveQty}
                onChange={e => setMoveQty(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm ${
                  isDark ? 'bg-slate-800/50 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
                dir="ltr"
              />
            </div>
            {currentUser?.role !== 'admin' && (
              <p className={`text-[11px] ${isDark ? 'text-amber-200/90' : 'text-amber-800'}`}>
                پس از ارسال، مدیر از صفحه «تأیید فعالیت» و اعلان‌ها مطلع می‌شود.
              </p>
            )}
          </div>
        ) : null}
      </FormModal>
    </div>
  );
}
