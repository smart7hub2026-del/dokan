import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle,
  XCircle,
  Eye,
  X,
  Clock,
  Package,
  ClipboardList,
  Send,
  User,
  ArrowDownToLine,
  Wallet,
  Receipt,
  Activity,
} from 'lucide-react';
import { Invoice } from '../data/mockData';
import { useStore, type PurchaseListTaskData } from '../store/useStore';
import { useToast } from './Toast';
import { useApp } from '../context/AppContext';

const MISC_TYPES = ['warehouse_transfer', 'staff_expense', 'staff_cash', 'staff_return'] as const;

export default function PendingPage() {
  const { t, isDark } = useApp();
  const invoices = useStore(s => s.invoices);
  const approveItem = useStore(s => s.approveItem);
  const rejectItem = useStore(s => s.rejectItem);
  const pendingApprovals = useStore(s => s.pendingApprovals);
  const updatePendingApproval = useStore(s => s.updatePendingApproval);
  const reportStaffActivityToAdmins = useStore(s => s.reportStaffActivityToAdmins);
  const currentUser = useStore(s => s.currentUser);
  const { success, error, warning } = useToast();

  const isShopAdmin = currentUser?.role === 'admin';

  const th = useMemo(
    () => ({
      h1: isDark ? 'text-white' : 'text-slate-900',
      sub: isDark ? 'text-slate-400' : 'text-slate-600',
      section: isDark ? 'text-white' : 'text-slate-900',
      card: isDark
        ? 'rounded-2xl border border-white/10 bg-slate-950/50 backdrop-blur-xl shadow-xl shadow-black/20'
        : 'rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60',
      cardInner: isDark ? 'bg-slate-900/60 border border-white/[0.06]' : 'bg-slate-50 border border-slate-100',
      muted: isDark ? 'text-slate-500' : 'text-slate-500',
      body: isDark ? 'text-slate-200' : 'text-slate-700',
      tableHead: isDark ? 'bg-slate-800/70 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600',
      tableRow: isDark ? 'divide-white/5 border-white/5' : 'divide-slate-100 border-slate-100',
      invoiceBox: isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-100',
      btnGhost: isDark
        ? 'border-slate-600 text-slate-200 hover:bg-white/5'
        : 'border-slate-200 text-slate-700 hover:bg-slate-50',
      statPending: isDark
        ? 'bg-gradient-to-br from-amber-600/90 to-amber-800 text-white'
        : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-900/15',
      statOk: isDark
        ? 'bg-gradient-to-br from-emerald-600/90 to-emerald-900 text-white'
        : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-900/15',
      statNo: isDark
        ? 'bg-gradient-to-br from-rose-600/80 to-rose-900 text-white'
        : 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-md shadow-rose-900/15',
      emptyCard: isDark ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-slate-50/80',
      modalShell: isDark ? 'glass-dark border-white/10 bg-slate-950/95' : 'bg-white border-slate-200 shadow-2xl',
      modalOverlay: 'bg-black/55 backdrop-blur-sm',
    }),
    [isDark]
  );

  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!viewInvoice) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [viewInvoice]);

  const pending = invoices.filter(i => i.approval_status === 'pending');
  const approved = invoices.filter(i => i.approval_status === 'approved');
  const rejected = invoices.filter(i => i.approval_status === 'rejected');

  const purchaseListTasks = pendingApprovals.filter(p => p.type === 'purchase_list' && p.status === 'pending');

  const visiblePurchaseTasks = useMemo(
    () =>
      purchaseListTasks.filter(t => {
        const d = t.data as unknown as PurchaseListTaskData;
        return currentUser?.role === 'admin' || currentUser?.id === d.assignee_user_id;
      }),
    [purchaseListTasks, currentUser?.id, currentUser?.role]
  );

  const miscTasks = pendingApprovals.filter(
    p => p.status === 'pending' && MISC_TYPES.includes(p.type as (typeof MISC_TYPES)[number])
  );

  const handleApprove = (invoiceId: number) => {
    if (!isShopAdmin) return;
    const pendingItem = pendingApprovals.find(
      p => p.type === 'sale' && (p.data as { invoice_id?: number }).invoice_id === invoiceId
    );
    if (pendingItem) approveItem(pendingItem.id, currentUser?.full_name || 'Admin');
  };

  const handleReject = (invoiceId: number) => {
    if (!isShopAdmin) return;
    const pendingItem = pendingApprovals.find(
      p => p.type === 'sale' && (p.data as { invoice_id?: number }).invoice_id === invoiceId
    );
    if (pendingItem) rejectItem(pendingItem.id, currentUser?.full_name || 'Admin');
  };

  const handleApprovePurchaseList = (taskId: number) => {
    if (!isShopAdmin) return;
    approveItem(taskId, currentUser?.full_name || 'مدیر');
    success('تأیید شد', 'لیست خرید تأیید نهایی شد.');
  };

  const handleRejectPurchaseList = (taskId: number) => {
    if (!isShopAdmin) return;
    rejectItem(taskId, currentUser?.full_name || 'مدیر');
    warning('رد شد', 'لیست خرید رد شد؛ در صورت نیاز دوباره ارسال کنید.');
  };

  const handleApproveMisc = (taskId: number) => {
    if (!isShopAdmin) return;
    approveItem(taskId, currentUser?.full_name || 'مدیر');
    success('تأیید شد', 'در حسابداری / موجودی اعمال شد.');
  };

  const handleRejectMisc = (taskId: number) => {
    if (!isShopAdmin) return;
    rejectItem(taskId, currentUser?.full_name || 'مدیر');
    warning('رد شد', 'درخواست رد شد.');
  };

  const setPickedLine = (taskId: number, lineIndex: number, checked: boolean) => {
    updatePendingApproval(taskId, p => {
      const d = { ...(p.data as unknown as PurchaseListTaskData) };
      const next = [...d.picked];
      next[lineIndex] = checked;
      return { ...p, data: { ...d, picked: next } as Record<string, unknown> };
    });
  };

  const handleSavePurchaseProgress = (taskId: number) => {
    const task = useStore.getState().pendingApprovals.find(p => p.id === taskId);
    if (!task || task.type !== 'purchase_list') return;
    const d = task.data as unknown as PurchaseListTaskData;
    const done = d.picked.filter(Boolean).length;
    reportStaffActivityToAdmins(
      'پیشرفت لیست خرید',
      `فاکتور ${d.invoice_number}: ${done} از ${d.line_labels.length} قلم علامت خورده است.`,
      currentUser?.id ?? 0,
      currentUser?.full_name || 'کاربر'
    );
    success('ثبت شد', 'پیشرفت برای مدیر گزارش شد.');
  };

  const handleSubmitPurchaseToAdmin = (taskId: number) => {
    const task = useStore.getState().pendingApprovals.find(p => p.id === taskId);
    if (!task || task.type !== 'purchase_list') return;
    const d = task.data as unknown as PurchaseListTaskData;
    if (!d.picked.every(Boolean)) {
      error('ناقص', 'همه اقلام را تیک بزنید تا بتوانید برای مدیر بفرستید.');
      return;
    }
    updatePendingApproval(taskId, p => {
      const data = { ...(p.data as unknown as PurchaseListTaskData), phase: 'awaiting_admin' as const };
      return { ...p, data: data as Record<string, unknown> };
    });
    reportStaffActivityToAdmins(
      'لیست خرید آماده تأیید مدیر',
      `${currentUser?.full_name} همه اقلام فاکتور خرید ${d.invoice_number} را جمع کرد و درخواست تأیید داد.`,
      currentUser?.id ?? 0,
      currentUser?.full_name || 'کاربر'
    );
    success('ارسال شد', 'مدیر از همین صفحه یا اعلان‌ها می‌تواند یک‌کلیک تأیید کند.');
  };

  const btnPrimary = 'inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors';
  const btnDanger =
    'inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ' +
    (isDark ? 'bg-rose-600/15 text-rose-300 border-rose-500/35 hover:bg-rose-600/25' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100');

  return (
    <div className="space-y-6 sm:space-y-8 fade-in pb-4" dir="rtl">
      <header
        className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b pb-5 sm:pb-6 ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`hidden sm:flex h-12 w-12 rounded-2xl items-center justify-center shrink-0 ${
              isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            <Activity size={24} strokeWidth={2} />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${th.h1}`}>{t('pending_sales')}</h1>
            <p className={`text-sm mt-1.5 max-w-2xl leading-relaxed ${th.sub}`}>{t('pending_activity_hint')}</p>
          </div>
        </div>
      </header>

      {miscTasks.length > 0 && (
        <section className="space-y-3">
          <h2 className={`font-bold text-sm sm:text-base flex items-center gap-2 ${th.section}`}>
            <Package size={18} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
            انبار، مالی، صندوق و واپسی
          </h2>
          <div className="grid gap-3 sm:gap-4">
            {miscTasks.map(task => (
              <div key={task.id} className={`${th.card} p-4 sm:p-5 space-y-3 border-cyan-500/20`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`font-bold ${th.h1}`}>{task.title}</p>
                    <p className={`text-xs mt-1 ${th.sub}`}>{task.description}</p>
                    <p className={`text-[11px] mt-1.5 ${th.muted}`}>
                      درخواست‌دهنده: {task.submitted_by} ({task.submitted_by_role})
                    </p>
                  </div>
                  {task.type === 'warehouse_transfer' && (
                    <ArrowDownToLine size={22} className={isDark ? 'text-cyan-400 shrink-0' : 'text-cyan-600 shrink-0'} />
                  )}
                  {task.type === 'staff_expense' && (
                    <Receipt size={22} className={isDark ? 'text-amber-400 shrink-0' : 'text-amber-600 shrink-0'} />
                  )}
                  {task.type === 'staff_cash' && (
                    <Wallet size={22} className={isDark ? 'text-emerald-400 shrink-0' : 'text-emerald-600 shrink-0'} />
                  )}
                  {task.type === 'staff_return' && (
                    <Package size={22} className={isDark ? 'text-violet-400 shrink-0' : 'text-violet-600 shrink-0'} />
                  )}
                </div>
                {isShopAdmin ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleApproveMisc(task.id)} className={btnPrimary}>
                      <CheckCircle size={14} /> تأیید و اعمال
                    </button>
                    <button type="button" onClick={() => handleRejectMisc(task.id)} className={btnDanger}>
                      <XCircle size={14} /> رد
                    </button>
                  </div>
                ) : (
                  <p className={`text-xs font-medium ${isDark ? 'text-amber-200/90' : 'text-amber-800'}`}>
                    فقط مدیر دکان می‌تواند این درخواست را تأیید یا رد کند.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {visiblePurchaseTasks.length > 0 && (
        <section className="space-y-3">
          <h2 className={`font-bold text-sm sm:text-base flex items-center gap-2 ${th.section}`}>
            <ClipboardList size={18} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
            لیست خرید (فاکتور خرید)
          </h2>
          <div className="grid gap-3 sm:gap-4">
            {visiblePurchaseTasks.map(task => {
              const d = task.data as unknown as PurchaseListTaskData;
              const isAssignee = currentUser?.id === d.assignee_user_id;

              return (
                <div
                  key={task.id}
                  className={`${th.card} p-4 sm:p-5 space-y-4 border-violet-500/20`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-mono text-sm font-black ${isDark ? 'text-violet-300' : 'text-violet-700'}`}
                        >
                          {d.invoice_number}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            isDark ? 'bg-violet-500/20 text-violet-200' : 'bg-violet-100 text-violet-800'
                          }`}
                        >
                          {d.phase === 'collecting' ? 'در حال برداشت' : 'منتظر تأیید مدیر'}
                        </span>
                      </div>
                      <p className={`font-medium mt-1 ${th.body}`}>{d.supplier_name}</p>
                      <p className={`text-xs flex items-center gap-1 mt-0.5 ${th.muted}`}>
                        <User size={12} /> گیرنده: {d.assignee_name} — از طرف: {task.submitted_by}
                      </p>
                    </div>
                  </div>

                  <div className={`rounded-xl p-3 space-y-2 ${th.cardInner}`}>
                    {d.line_labels.map((label, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center justify-between gap-2 text-sm rounded-lg px-2 py-2 ${
                          isAssignee && d.phase === 'collecting'
                            ? isDark
                              ? 'cursor-pointer hover:bg-white/5'
                              : 'cursor-pointer hover:bg-white'
                            : ''
                        }`}
                      >
                        <span className={`flex-1 ${th.body}`}>
                          {label} <span className={`text-xs ${th.muted}`}>× {d.line_qty[idx]}</span>
                        </span>
                        {isAssignee && d.phase === 'collecting' ? (
                          <input
                            type="checkbox"
                            checked={d.picked[idx] || false}
                            onChange={e => setPickedLine(task.id, idx, e.target.checked)}
                            className={`rounded w-4 h-4 ${
                              isDark ? 'border-slate-500 text-violet-600' : 'border-slate-300 text-violet-600'
                            }`}
                          />
                        ) : (
                          <span
                            className={`text-xs font-bold ${
                              d.picked[idx]
                                ? isDark
                                  ? 'text-emerald-400'
                                  : 'text-emerald-600'
                                : th.muted
                            }`}
                          >
                            {d.picked[idx] ? '✓ جمع شد' : '—'}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>

                  {isAssignee && d.phase === 'collecting' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSavePurchaseProgress(task.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border ${th.btnGhost}`}
                      >
                        ثبت پیشرفت (گزارش به مدیر)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitPurchaseToAdmin(task.id)}
                        className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 flex items-center gap-1"
                      >
                        <Send size={14} /> همه جمع شد — ارسال برای تأیید مدیر
                      </button>
                    </div>
                  )}

                  {isAssignee && d.phase === 'awaiting_admin' && (
                    <p className={`text-xs font-medium ${isDark ? 'text-amber-200/90' : 'text-amber-800'}`}>
                      در انتظار تأیید نهایی مدیر است؛ نیازی به اقدام دیگر نیست.
                    </p>
                  )}

                  {currentUser?.role === 'admin' && d.phase === 'awaiting_admin' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="button" onClick={() => handleApprovePurchaseList(task.id)} className={btnPrimary}>
                        <CheckCircle size={14} /> تأیید نهایی لیست
                      </button>
                      <button type="button" onClick={() => handleRejectPurchaseList(task.id)} className={btnDanger}>
                        <XCircle size={14} /> رد
                      </button>
                    </div>
                  )}

                  {currentUser?.role === 'admin' && d.phase === 'collecting' && (
                    <p className={`text-xs ${th.muted}`}>
                      همکار در حال جمع‌آوری است؛ پس از ارسال برای شما، دکمهٔ تأیید ظاهر می‌شود.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className={`font-bold text-sm sm:text-base flex items-center gap-2 mb-3 ${th.section}`}>
          <Package size={18} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          فاکتور فروش
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'در انتظار', value: pending.length, className: th.statPending, icon: Clock },
            { label: 'تأییدشده', value: approved.length, className: th.statOk, icon: CheckCircle },
            { label: 'ردشده', value: rejected.length, className: th.statNo, icon: XCircle },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 sm:p-5 ${s.className}`}>
              <s.icon size={22} className="text-white/80 mb-2" />
              <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">{s.value}</p>
              <p className="text-white/85 text-xs sm:text-sm mt-1 font-bold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {pending.length === 0 ? (
        <div className={`rounded-2xl p-10 sm:p-12 text-center border ${th.emptyCard}`}>
          <CheckCircle size={44} className={`mx-auto mb-3 opacity-40 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <p className={th.sub}>هیچ فاکتور فروشی در انتظار تأیید نیست</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <h2 className={`font-bold text-sm sm:text-base flex items-center gap-2 ${th.section}`}>
            <Clock size={18} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
            فاکتورهای فروش در انتظار تأیید
          </h2>
          {pending.map(inv => (
            <div
              key={inv.id}
              className={`${th.card} p-4 sm:p-5 border-amber-500/25`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-mono text-sm ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {inv.invoice_number}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isDark ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      در انتظار
                    </span>
                  </div>
                  <p className={`font-semibold ${th.h1}`}>{inv.customer_name}</p>
                  <p className={`text-xs ${th.sub}`}>
                    {inv.customer_phone} | فروشنده: {inv.seller_name}
                  </p>
                </div>
                <div className="text-right sm:text-left sm:min-w-[7rem]">
                  <p className={`text-xl sm:text-2xl font-black ${th.h1}`}>{inv.total.toLocaleString()} ؋</p>
                  <p className={`text-xs ${th.muted}`}>{inv.invoice_date}</p>
                </div>
              </div>

              <div className={`rounded-xl p-3 mb-3 border ${th.invoiceBox}`}>
                <p className={`text-xs mb-2 ${th.muted}`}>آیتم‌های فاکتور ({inv.items.length} قلم):</p>
                <div className="space-y-1">
                  {inv.items.map(item => (
                    <div key={item.id} className={`flex justify-between text-xs gap-2 ${th.body}`}>
                      <span className="min-w-0 truncate">{item.product_name}</span>
                      <span className={`shrink-0 ${th.muted}`}>
                        {item.quantity} × {item.unit_price.toLocaleString()} ={' '}
                        <span className={`font-bold ${th.h1}`}>{item.total_price.toLocaleString()} ؋</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className={`border-t mt-2 pt-2 flex justify-between text-xs ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  {inv.discount > 0 && (
                    <span className={isDark ? 'text-amber-400' : 'text-amber-700'}>
                      تخفیف: {inv.discount.toLocaleString()} ؋
                    </span>
                  )}
                  <span className={`mr-auto ${th.muted}`}>
                    جمع: <span className={`font-bold ${th.h1}`}>{inv.total.toLocaleString()} ؋</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-bold ${
                      inv.payment_method === 'cash'
                        ? isDark
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-emerald-100 text-emerald-800'
                        : isDark
                          ? 'bg-amber-500/20 text-amber-200'
                          : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {inv.payment_method === 'cash' ? 'نقدی' : 'نسیه'}
                  </span>
                  {inv.due_amount > 0 && (
                    <span className={`text-xs font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                      بدهی: {inv.due_amount.toLocaleString()} ؋
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => setViewInvoice(inv)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${th.btnGhost}`}
                  >
                    <Eye size={14} /> جزئیات
                  </button>
                  {isShopAdmin ? (
                    <>
                      <button type="button" onClick={() => handleReject(inv.id)} className={btnDanger}>
                        <XCircle size={14} /> رد کردن
                      </button>
                      <button type="button" onClick={() => handleApprove(inv.id)} className={btnPrimary}>
                        <CheckCircle size={14} /> تأیید
                      </button>
                    </>
                  ) : (
                    <span className={`text-xs font-medium self-center ${isDark ? 'text-amber-200/90' : 'text-amber-800'}`}>
                      منتظر تأیید مدیر
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(approved.length > 0 || rejected.length > 0) && (
        <div>
          <h2 className={`font-bold text-sm sm:text-base mb-3 ${th.section}`}>تاریخچه بررسی فروش</h2>
          <div className={`rounded-2xl border overflow-hidden ${th.card}`}>
            <div className="overflow-x-auto -mx-px">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className={`border-b ${th.tableHead}`}>
                    {['فاکتور', 'مشتری', 'مبلغ', 'وضعیت', 'تاریخ'].map(h => (
                      <th key={h} className="text-right font-bold py-3 px-3 sm:px-4 text-xs sm:text-sm">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
                  {[...approved, ...rejected].map(inv => (
                    <tr key={inv.id} className={isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/80'}>
                      <td className={`py-3 px-3 sm:px-4 font-mono text-xs ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {inv.invoice_number}
                      </td>
                      <td className={`py-3 px-3 sm:px-4 font-medium ${th.body}`}>{inv.customer_name}</td>
                      <td className={`py-3 px-3 sm:px-4 font-bold ${th.h1}`}>{inv.total.toLocaleString()} ؋</td>
                      <td className="py-3 px-3 sm:px-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-bold ${
                            inv.approval_status === 'approved'
                              ? isDark
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-emerald-100 text-emerald-800'
                              : isDark
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.approval_status === 'approved' ? 'تأییدشده' : 'ردشده'}
                        </span>
                      </td>
                      <td className={`py-3 px-3 sm:px-4 text-xs ${th.muted}`}>{inv.invoice_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewInvoice &&
        createPortal(
          <div
            className={`fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto overscroll-contain p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:p-4 sm:py-6 ${th.modalOverlay}`}
            style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="fixed inset-0 cursor-default"
              aria-label="بستن"
              onClick={() => setViewInvoice(null)}
            />
            <div
              className={`relative z-[1] my-auto rounded-2xl w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-1.5rem))] flex flex-col overflow-hidden border ${th.modalShell}`}
              onClick={e => e.stopPropagation()}
            >
              <div
                className={`flex shrink-0 items-center justify-between p-4 sm:p-5 border-b ${
                  isDark ? 'border-white/10' : 'border-slate-200'
                }`}
              >
                <h2 className={`font-bold ${th.h1}`}>فاکتور {viewInvoice.invoice_number}</h2>
                <button type="button" onClick={() => setViewInvoice(null)} className={th.muted}>
                  <X size={20} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {[
                    ['مشتری', viewInvoice.customer_name],
                    ['موبایل', viewInvoice.customer_phone],
                    ['فروشنده', viewInvoice.seller_name],
                    ['تاریخ', viewInvoice.invoice_date],
                    ['روش پرداخت', viewInvoice.payment_method === 'cash' ? 'نقدی' : 'نسیه'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span className={`block text-xs ${th.muted}`}>{k}</span>
                      <span className={`font-medium ${th.body}`}>{v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className={`text-sm font-bold mb-2 ${th.h1}`}>آیتم‌ها</h3>
                  <div className="space-y-2">
                    {viewInvoice.items.map(item => (
                      <div
                        key={item.id}
                        className={`flex justify-between rounded-xl p-3 text-sm border ${th.invoiceBox}`}
                      >
                        <span className={th.body}>{item.product_name}</span>
                        <div className="text-left">
                          <span className={th.muted}>
                            {item.quantity} × {item.unit_price.toLocaleString()}
                          </span>
                          <span
                            className={`font-bold mr-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                          >
                            {item.total_price.toLocaleString()} ؋
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`border-t pt-3 space-y-2 text-sm ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <div className={`flex justify-between ${th.muted}`}>
                    <span>جمع:</span>
                    <span className={th.h1}>{viewInvoice.subtotal.toLocaleString()} ؋</span>
                  </div>
                  {viewInvoice.discount > 0 && (
                    <div className="flex justify-between">
                      <span className={th.muted}>تخفیف:</span>
                      <span className={isDark ? 'text-amber-400' : 'text-amber-700'}>
                        -{viewInvoice.discount.toLocaleString()} ؋
                      </span>
                    </div>
                  )}
                  <div className={`flex justify-between font-bold ${th.h1}`}>
                    <span>مجموع:</span>
                    <span className="text-lg">{viewInvoice.total.toLocaleString()} ؋</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={th.muted}>پرداخت‌شده:</span>
                    <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>
                      {viewInvoice.paid_amount.toLocaleString()} ؋
                    </span>
                  </div>
                  {viewInvoice.due_amount > 0 && (
                    <div className="flex justify-between">
                      <span className={th.muted}>بدهی:</span>
                      <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                        {viewInvoice.due_amount.toLocaleString()} ؋
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
