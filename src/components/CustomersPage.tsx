import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, X, Phone, MapPin, MessageCircle, Mail, Bell, BellOff, Eye, Printer, Send, History,
  TrendingDown, TrendingUp, ChevronRight, ChevronDown, Mic, MicOff, Upload, GitMerge, RotateCcw, FileDown,
  AlertTriangle,
} from 'lucide-react';
import { Customer, Invoice, Debt } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import FormModal from './ui/FormModal';
import { useToast } from './Toast';
import { toWhatsAppDialNumber, customerPhoneKey } from '../utils/customerPhone';
import { customerOpenDebtBalanceMismatch, openDebtRemainingTotal } from '../utils/customerDebtBalance';

type PrintSize = 'A4' | 'A5' | '80mm' | '58mm';

function DeleteConfirmModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" style={{ overscrollBehavior: 'contain' }}>
      <div className="glass-dark rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={28} className="text-rose-400" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">آیا مطمئنید؟</h3>
        <p className="text-slate-400 text-sm mb-1">مشتری <span className="text-white font-medium">"{name}"</span> حذف شود؟</p>
        <p className="text-rose-400 text-xs mb-2">این عمل قابل بازگشت نیست.</p>
        <p className="text-amber-400 text-xs mb-6">⚠️ سوابق خرید این مشتری محفوظ می‌ماند.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition-colors">بله، آرشیو شود</button>
          <button onClick={onClose} className="flex-1 glass text-slate-300 py-2.5 rounded-xl hover:text-white">انصراف</button>
        </div>
      </div>
    </div>
  );
}

function SendMessageModal({
  customer,
  dialCode,
  formatPrice,
  onClose,
}: {
  customer: Customer;
  dialCode: string;
  formatPrice: (amount: number) => string;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setMsg(
      `مشتری گرامی ${customer.name}، ماندهٔ حساب شما ${formatPrice(Math.abs(customer.balance))} است. در صورت بدهی لطفاً برای تسویه اقدام فرمایید.`,
    );
    if (customer.whatsapp || customer.phone) setMethod('whatsapp');
    else if (customer.email) setMethod('email');
  }, [customer, formatPrice]);

  const handleSend = () => {
    if (method === 'whatsapp' && (customer.whatsapp || customer.phone)) {
      const raw = String(customer.whatsapp || customer.phone);
      const waDigits = toWhatsAppDialNumber(raw, dialCode);
      if (!waDigits) return;
      const text = encodeURIComponent(msg);
      window.open(`https://wa.me/${waDigits}?text=${text}`, '_blank');
    } else if (method === 'email' && customer.email) {
      window.open(
        `mailto:${customer.email}?subject=${encodeURIComponent('یادآوری حساب')}&body=${encodeURIComponent(msg)}`,
        '_blank',
      );
    }
    setSent(true);
    setTimeout(() => {
      setSent(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="glass-dark rounded-2xl w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold flex items-center gap-2"><Send size={18} className="text-green-400" /> ارسال پیام به {customer.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            {(customer.whatsapp || customer.phone) && (
              <button onClick={() => setMethod('whatsapp')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${method === 'whatsapp' ? 'bg-green-600/20 border-green-500 text-green-400' : 'glass border-white/10 text-slate-400'}`}>
                <MessageCircle size={18} /> واتساپ
              </button>
            )}
            {customer.email && (
              <button onClick={() => setMethod('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${method === 'email' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'glass border-white/10 text-slate-400'}`}>
                <Mail size={18} /> ایمیل
              </button>
            )}
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">متن پیام</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none resize-none" />
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            واتساپ فقط لینک wa.me در مرورگر باز می‌کند؛ ایمیل از طریق برنامهٔ ایمیل دستگاه. ارسال انبوه یا قالب رسمی سروری نیست. رضایت بازاریابی را در پروندهٔ مشتری ثبت کنید.
          </p>
          <div className="flex gap-3">
            <button onClick={handleSend} disabled={sent}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${sent ? 'bg-emerald-600 text-white' : 'btn-primary text-white'}`}>
              {sent ? '✓ باز شد' : <><Send size={16} /> باز کردن واتساپ / ایمیل</>}
            </button>
            <button onClick={onClose} className="px-5 glass text-slate-300 py-2.5 rounded-xl hover:text-white">انصراف</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerHistoryModal({ customer, invoices, debts, formatMoney, onClose }: {
  customer: Customer; invoices: Invoice[]; debts: Debt[]; formatMoney: (n: number) => string; onClose: () => void;
}) {
  const [printSize, setPrintSize] = useState<PrintSize>('A4');
  const [printPickOpen, setPrintPickOpen] = useState(false);
  const custInvoices = invoices.filter(i => i.customer_id === customer.id);
  const custDebts = debts.filter(d => d.customer_id === customer.id);
  const custOpenDebts = useMemo(
    () => custDebts.filter((d) => d.remaining_amount > 0.5),
    [custDebts],
  );
  const debtBalanceMismatch = customerOpenDebtBalanceMismatch(customer, debts);
  const openDebtTotal = openDebtRemainingTotal(customer.id, debts);

  const handlePrint = () => {
    const sizeMap = { 'A4': 'a4', 'A5': 'a5', '80mm': '80mm', '58mm': '58mm' };
    const win = window.open('', '_blank');
    if (!win) return;
    const fontSize = printSize === '58mm' ? '8px' : printSize === '80mm' ? '10px' : '12px';
    win.document.write(`
      <html dir="rtl"><head><title>پروفایل مشتری</title>
      <style>
        @page { size: ${sizeMap[printSize]}; margin: 10mm; }
        body { font-family: Tahoma, sans-serif; font-size: ${fontSize}; color: #000; }
        h1 { font-size: calc(${fontSize} + 4px); border-bottom: 2px solid #333; padding-bottom: 3mm; }
        h2 { font-size: calc(${fontSize} + 2px); color: #333; margin-top: 5mm; }
        table { width: 100%; border-collapse: collapse; margin-top: 3mm; }
        th { background: #f0f0f0; padding: 2mm; text-align: right; font-weight: bold; border: 1px solid #ddd; }
        td { padding: 2mm; border: 1px solid #ddd; text-align: right; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 3mm 0; }
        .info-item { background: #f9f9f9; padding: 2mm; border-radius: 2mm; }
        .label { color: #666; font-size: calc(${fontSize} - 1px); }
        .value { font-weight: bold; }
        .debt { color: #dc2626; }
        .paid { color: #16a34a; }
        .footer { margin-top: 8mm; border-top: 1px solid #ddd; padding-top: 3mm; text-align: center; color: #666; }
      </style></head><body>
      <h1>پروفایل مشتری</h1>
      <div class="info-grid">
        <div class="info-item"><div class="label">نام کامل</div><div class="value">${customer.name}</div></div>
        <div class="info-item"><div class="label">کد مشتری</div><div class="value">${customer.customer_code}</div></div>
        <div class="info-item"><div class="label">شماره تماس</div><div class="value">${customer.phone}</div></div>
        <div class="info-item"><div class="label">آدرس</div><div class="value">${customer.address || '-'}</div></div>
        <div class="info-item"><div class="label">واتساپ</div><div class="value">${customer.whatsapp || '-'}</div></div>
        <div class="info-item"><div class="label">ایمیل</div><div class="value">${customer.email || '-'}</div></div>
        <div class="info-item"><div class="label">کل خرید</div><div class="value">${formatMoney(customer.total_purchases)}</div></div>
        <div class="info-item"><div class="label">موجودی حساب</div>
          <div class="value ${customer.balance < 0 ? 'debt' : 'paid'}">${customer.balance < 0 ? formatMoney(Math.abs(customer.balance)) + ' بدهکار' : customer.balance > 0 ? formatMoney(customer.balance) + ' بستانکار' : 'تسویه'}</div>
        </div>
      </div>
      <h2>سوابق فاکتورها (${custInvoices.length} فاکتور)</h2>
      <table>
        <tr><th>شماره فاکتور</th><th>تاریخ</th><th>مبلغ کل</th><th>پرداخت شده</th><th>مانده</th><th>وضعیت</th></tr>
        ${custInvoices.map(inv => `
          <tr>
            <td>${inv.invoice_number}</td>
            <td>${inv.invoice_date}</td>
            <td>${formatMoney(inv.total)}</td>
            <td>${formatMoney(inv.paid_amount)}</td>
            <td class="${inv.due_amount > 0 ? 'debt' : 'paid'}">${formatMoney(inv.due_amount)}</td>
            <td>${inv.payment_method === 'cash' ? 'نقدی' : 'نسیه'}</td>
          </tr>
        `).join('')}
      </table>
      ${custOpenDebts.length > 0 ? `
        <h2>قرض با مانده (${custOpenDebts.length} مورد)</h2>
        <table>
          <tr><th>فاکتور</th><th>مبلغ اصلی</th><th>پرداخت شده</th><th>مانده</th><th>سررسید</th><th>وضعیت</th></tr>
          ${custOpenDebts.map(d => `
            <tr>
              <td>${d.invoice_number}</td>
              <td>${formatMoney(d.amount)}</td>
              <td>${formatMoney(d.paid_amount)}</td>
              <td class="debt">${formatMoney(d.remaining_amount)}</td>
              <td>${d.due_date}</td>
              <td>${d.status === 'overdue' ? '⚠️ معوق' : d.status === 'partial' ? 'جزئی' : 'در انتظار'}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
      <div class="footer">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')} | سیستم مدیریت فروشگاه</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    win.document.close();
    setPrintPickOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-dark relative rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 glass-dark z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 flex items-center justify-center text-white font-bold text-lg">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-white font-semibold">{customer.name}</h2>
              <p className="text-slate-400 text-xs">{customer.customer_code} | {customer.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPrintPickOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/40 text-sm transition-all">
              <Printer size={14} /> چاپ
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {debtBalanceMismatch && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
              <p className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                ناسازگاری ماندهٔ حساب با قرض‌های باز
              </p>
              <p className="text-amber-100/90 leading-relaxed">
                ماندهٔ ثبت‌شده برای این مشتری با جمع ماندهٔ قرض‌های باز ({formatMoney(openDebtTotal)}) یکی نیست. اگر واردات یا ویرایش دستی داشتید، یکی از دو طرف را اصلاح کنید؛ فروش نسیهٔ جدید معمولاً خودکار هماهنگ می‌ماند.
              </p>
            </div>
          )}
          {/* Customer Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'کل خرید', value: formatMoney(customer.total_purchases), color: 'text-blue-400' },
              { label: 'موجودی', value: customer.balance < 0 ? `${formatMoney(Math.abs(customer.balance))} بدهکار` : customer.balance > 0 ? `${formatMoney(customer.balance)} بستانکار` : 'تسویه', color: customer.balance < 0 ? 'text-rose-400' : customer.balance > 0 ? 'text-emerald-400' : 'text-slate-400' },
              { label: 'تعداد فاکتور', value: custInvoices.length, color: 'text-purple-400' },
              { label: 'قرض باز', value: custOpenDebts.length, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Contact Info */}
          <div className="glass rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /><span className="text-slate-300">{customer.phone}</span></div>
            {customer.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /><span className="text-slate-300">{customer.address}</span></div>}
            {customer.whatsapp && <div className="flex items-center gap-2"><MessageCircle size={14} className="text-green-400" /><span className="text-green-300">{customer.whatsapp}</span></div>}
            {customer.email && <div className="flex items-center gap-2"><Mail size={14} className="text-blue-400" /><span className="text-blue-300">{customer.email}</span></div>}
          </div>

          {/* Invoices History */}
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
              <History size={16} className="text-indigo-400" /> سوابق فاکتورها ({custInvoices.length})
            </h3>
            {custInvoices.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">هیچ فاکتوری ثبت نشده</p>
            ) : (
              <div className="space-y-2">
                {custInvoices.map(inv => (
                  <div key={inv.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inv.payment_method === 'cash' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                        {inv.payment_method === 'cash' ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-amber-400" />}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{inv.invoice_number}</p>
                        <p className="text-slate-400 text-xs">{inv.invoice_date} | {inv.items?.length || 0} قلم</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{formatMoney(inv.total)}</p>
                      {inv.due_amount > 0 && <p className="text-rose-400 text-xs">مانده: {formatMoney(inv.due_amount)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Debts */}
          {custOpenDebts.length > 0 && (
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-rose-400" /> قرض‌های با مانده ({custOpenDebts.length})
              </h3>
              <div className="space-y-2">
                {custOpenDebts.map(d => (
                  <div key={d.id} className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{d.invoice_number}</p>
                      <p className="text-slate-400 text-xs">سررسید: {d.due_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-rose-400 font-bold">{formatMoney(d.remaining_amount)} مانده</p>
                      <p className="text-slate-500 text-xs">پرداخت شده: {formatMoney(d.paid_amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {printPickOpen && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl">
              <p className="text-white text-sm font-bold mb-3">انتخاب سایز چاپ</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['58mm', '80mm', 'A5', 'A4'] as PrintSize[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrintSize(s)}
                    className={`py-2.5 rounded-xl text-xs font-bold ${printSize === s ? 'bg-indigo-600 text-white' : 'glass text-slate-400'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPrintPickOpen(false)} className="flex-1 glass text-slate-300 py-2.5 rounded-xl text-sm">
                  انصراف
                </button>
                <button type="button" onClick={() => void handlePrint()} className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1">
                  <Printer size={14} /> چاپ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomersPage({ embedInHub = false }: { embedInHub?: boolean } = {}) {
  const { isDark, t, formatPrice } = useApp();
  const { success: toastSuccess } = useToast();
  const customers = useStore(s => s.customers);
  const invoices = useStore(s => s.invoices);
  const debts = useStore(s => s.debts);
  const currentUser = useStore(s => s.currentUser);
  const addCustomer = useStore(s => s.addCustomer);
  const updateCustomer = useStore(s => s.updateCustomer);
  const deleteCustomer = useStore(s => s.deleteCustomer);
  const mergeCustomers = useStore(s => s.mergeCustomers);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [msgCustomer, setMsgCustomer] = useState<Customer | null>(null);
  const [deleteItem, setDeleteItem] = useState<Customer | null>(null);
  const [listPrintOpen, setListPrintOpen] = useState(false);
  const [listPrintSize, setListPrintSize] = useState<PrintSize>('A4');
  const [waDialCode, setWaDialCode] = useState(() => localStorage.getItem('dokanyar_wa_cc') || '93');
  const [hideArchived, setHideArchived] = useState(true);
  const [mergePrimary, setMergePrimary] = useState<Customer | null>(null);
  const [mergeRemoveId, setMergeRemoveId] = useState<number>(0);
  const importRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '', email: '', address: '',
    reminder_enabled: true, reminder_days_before: 3,
    marketing_consent: true,
  });

  useEffect(() => {
    localStorage.setItem('dokanyar_wa_cc', waDialCode);
  }, [waDialCode]);

  useEffect(() => {
    if (filter === 'archived') setHideArchived(false);
  }, [filter]);

  const { isListening, startListening, stopListening, supported } = useVoiceSearch((text) => {
    setSearch(text);
  });

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'glass' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';
  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:border-indigo-500 outline-none';

  const dormantIds = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() - 90);
    const ymd = limit.toISOString().slice(0, 10);
    const ids = new Set<number>();
    for (const c of customers) {
      if (c.archived_at) continue;
      const invs = invoices.filter((i) => i.customer_id === c.id);
      const last = invs.reduce((m, i) => (i.invoice_date > m ? i.invoice_date : m), '');
      if (invs.length === 0 || last < ymd) ids.add(c.id);
    }
    return ids;
  }, [customers, invoices]);

  const purchaseMedian = useMemo(() => {
    const active = customers.filter((c) => !c.archived_at);
    if (!active.length) return 0;
    const sorted = [...active].map((c) => c.total_purchases).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  }, [customers]);

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        if (hideArchived && c.archived_at) return false;
        const matchSearch =
          c.name.includes(search) ||
          c.phone.includes(search) ||
          c.customer_code.includes(search);
        let matchFilter = true;
        if (filter === 'archived') matchFilter = Boolean(c.archived_at);
        else if (filter === 'active') matchFilter = c.status === 'active' && !c.archived_at;
        else if (filter === 'inactive') matchFilter = c.status === 'inactive' && !c.archived_at;
        else if (filter === 'debtor') matchFilter = c.balance < 0;
        else if (filter === 'creditor') matchFilter = c.balance > 0;
        else if (filter === 'reminder') matchFilter = c.reminder_enabled;
        else if (filter === 'dormant') matchFilter = dormantIds.has(c.id);
        else if (filter === 'high_value') {
          matchFilter = !c.archived_at && purchaseMedian > 0 && c.total_purchases >= purchaseMedian;
        }
        return matchSearch && matchFilter;
      }),
    [customers, search, filter, hideArchived, dormantIds, purchaseMedian],
  );

  const debtSyncWarnings = useMemo(() => {
    const s = new Set<number>();
    for (const c of customers) {
      if (customerOpenDebtBalanceMismatch(c, debts)) s.add(c.id);
    }
    return s;
  }, [customers, debts]);

  useEffect(() => {
    const raw = searchParams.get('customer');
    if (!raw || !/^\d+$/.test(raw)) return;
    const id = Number(raw);
    const c = customers.find((x) => x.id === id);
    if (!c) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete('customer');
          return p;
        },
        { replace: true },
      );
      return;
    }
    setHistoryCustomer(c);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('customer');
        return p;
      },
      { replace: true },
    );
  }, [searchParams, customers, setSearchParams]);

  const totalDebt = customers.filter(c => !c.archived_at && c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);
  const totalCredit = customers.filter(c => !c.archived_at && c.balance > 0).reduce((s, c) => s + c.balance, 0);

  const openAdd = () => {
    setEditItem(null);
    setForm({
      name: '', phone: '', whatsapp: '', email: '', address: '',
      reminder_enabled: true, reminder_days_before: 3, marketing_consent: true,
    });
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditItem(c);
    setForm({
      name: c.name,
      phone: c.phone,
      whatsapp: c.whatsapp || '',
      email: c.email || '',
      address: c.address,
      reminder_enabled: c.reminder_enabled,
      reminder_days_before: c.reminder_days_before,
      marketing_consent: c.marketing_consent !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = currentUser?.tenant_id ?? 1;
    const key = customerPhoneKey(form.phone);
    if (
      key &&
      customers.some(
        (x) =>
          !x.archived_at &&
          x.id !== editItem?.id &&
          customerPhoneKey(x.phone) === key,
      )
    ) {
      window.alert('این شماره موبایل برای مشتری دیگری ثبت شده است.');
      return;
    }
    if (editItem) {
      updateCustomer({
        ...editItem,
        name: form.name,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        address: form.address,
        reminder_enabled: form.reminder_enabled,
        reminder_days_before: form.reminder_days_before,
        marketing_consent: form.marketing_consent,
      });
      toastSuccess('مشتری', 'تغییرات ذخیره شد.');
    } else {
      const created = addCustomer({
        name: form.name,
        phone: form.phone,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        address: form.address,
        balance: 0,
        total_purchases: 0,
        status: 'active',
        reminder_enabled: form.reminder_enabled,
        reminder_days_before: form.reminder_days_before,
        tenant_id: tenantId,
        marketing_consent: form.marketing_consent,
      });
      if (!created) {
        window.alert('شماره موبایل تکراری است.');
        return;
      }
      toastSuccess('مشتری', 'ثبت شد.');
    }
    setShowModal(false);
  };

  const doDelete = () => {
    if (deleteItem) {
      deleteCustomer(deleteItem.id);
      setDeleteItem(null);
    }
  };

  const exportAccountantCsv = () => {
    const rows = [
      ['customer_code', 'name', 'phone', 'email', 'balance', 'total_purchases', 'archived', 'marketing_consent', 'notes_ui'],
    ];
    for (const c of customers) {
      rows.push([
        c.customer_code,
        c.name.replace(/"/g, '""'),
        customerPhoneKey(c.phone),
        c.email || '',
        String(c.balance),
        String(c.total_purchases),
        c.archived_at ? 'yes' : 'no',
        c.marketing_consent === false ? 'no' : 'yes',
        '',
      ]);
    }
    const csv = rows.map((r) => r.map((x) => `"${String(x)}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_accountant_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        q = !q;
      } else if ((ch === ',' && !q) || ch === ';' && !q) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out.map((s) => s.replace(/^"|"$/g, ''));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tenantId = currentUser?.tenant_id ?? 1;
    void file.text().then((text) => {
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return;
      let start = 0;
      const h = lines[0].toLowerCase();
      if (h.includes('name') && h.includes('phone')) start = 1;
      let n = 0;
      for (let i = start; i < lines.length; i += 1) {
        const cols = parseCsvLine(lines[i]);
        const name = cols[0] || '';
        const phone = cols[1] || cols[2] || '';
        if (!name || !phone) continue;
        const email = cols[2]?.includes('@') ? cols[2] : cols[3]?.includes('@') ? cols[3] : undefined;
        const address = cols[3] && !cols[3].includes('@') ? cols[3] : cols[4] || '';
        const created = addCustomer({
          name,
          phone,
          ...(email ? { email } : {}),
          address: address || '',
          balance: 0,
          total_purchases: 0,
          status: 'active',
          reminder_enabled: true,
          reminder_days_before: 3,
          tenant_id: tenantId,
          marketing_consent: true,
        });
        if (created) n += 1;
      }
      window.alert(n ? `${n} مشتری وارد شد (رد شدگان: شماره تکراری).` : 'هیچ ردیفی وارد نشد. فرمت: نام,موبایل یا سربرگ name,phone');
    });
    e.target.value = '';
  };

  const handlePrintAll = () => {
    const sizeMap: Record<PrintSize, string> = { 'A4': 'a4', 'A5': 'a5', '80mm': '80mm', '58mm': '58mm' };
    const fontSize = listPrintSize === '58mm' ? '8px' : listPrintSize === '80mm' ? '10px' : '12px';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="rtl"><head><title>لیست مشتریان</title>
      <style>
        @page { size: ${sizeMap[listPrintSize]}; margin: 10mm; }
        body { font-family: Tahoma, sans-serif; font-size: ${fontSize}; }
        h1 { border-bottom: 2px solid #333; padding-bottom: 3mm; font-size: calc(${fontSize} + 4px); }
        table { width: 100%; border-collapse: collapse; margin-top: 5mm; }
        th { background: #333; color: white; padding: 2mm; text-align: right; }
        td { padding: 2mm; border-bottom: 1px solid #eee; text-align: right; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .debt { color: #dc2626; font-weight: bold; }
        .credit { color: #16a34a; font-weight: bold; }
        .footer { margin-top: 5mm; text-align: center; font-size: calc(${fontSize} - 1px); color: #666; }
      </style></head><body>
      <h1>لیست مشتریان فروشگاه</h1>
      <p style="color:#666;font-size:calc(${fontSize}-1px)">تاریخ: ${new Date().toLocaleDateString('fa-IR')} | تعداد: ${filtered.length} مشتری</p>
      <table>
        <tr><th>#</th><th>کد</th><th>نام مشتری</th><th>شماره تماس</th><th>آدرس</th><th>بدهی / بستانکاری</th><th>کل خرید</th></tr>
        ${filtered.map((c, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${c.customer_code}</td>
            <td>${c.name}</td>
            <td>${c.phone}</td>
            <td>${c.address || '-'}</td>
            <td class="${c.balance < 0 ? 'debt' : c.balance > 0 ? 'credit' : ''}">${c.balance < 0 ? formatPrice(Math.abs(c.balance)) + ' بدهکار' : c.balance > 0 ? formatPrice(c.balance) + ' بستانکار' : 'تسویه'}</td>
            <td>${formatPrice(c.total_purchases)}</td>
          </tr>
        `).join('')}
      </table>
      <div class="footer">جمع کل بدهی: ${formatPrice(totalDebt)} | جمع کل بستانکاری: ${formatPrice(totalCredit)}</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    win.document.close();
    setListPrintOpen(false);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!embedInHub ? (
          <div>
            <h1 className={`text-2xl font-bold ${textColor}`}>{t('manage_customers')}</h1>
            <p className={`${subText} text-sm mt-1`}>
              {customers.filter((c) => !c.archived_at).length} فعال در لیست
              {customers.some((c) => c.archived_at) ? ` · ${customers.filter((c) => c.archived_at).length} آرشیو` : ''}
            </p>
          </div>
        ) : (
          <div>
            <h2 className={`text-lg font-bold ${textColor}`}>{t('customers_crm_directory_heading')}</h2>
            <p className={`${subText} text-xs mt-0.5`}>
              {customers.filter((c) => !c.archived_at).length} فعال
              {customers.some((c) => c.archived_at) ? ` · ${customers.filter((c) => c.archived_at).length} آرشیو` : ''}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 justify-end items-center">
          <input ref={importRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={handleImportFile} />
          <details className={`relative group ${isDark ? '' : '[&[open]]:z-10'}`}>
            <summary
              className={`list-none cursor-pointer flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                isDark
                  ? 'glass text-slate-300 hover:text-white border-white/10'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              } [&::-webkit-details-marker]:hidden`}
            >
              <FileDown size={16} className="opacity-80" />
              خروجی و واردات
              <ChevronDown size={16} className="opacity-70 group-open:rotate-180 transition-transform" />
            </summary>
            <div
              className={`absolute end-0 top-[calc(100%+0.35rem)] min-w-[14rem] rounded-xl border p-2 shadow-lg flex flex-col gap-1 z-20 ${
                isDark ? 'glass border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className={`flex items-center gap-2 w-full text-start px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Upload size={16} /> واردات CSV
              </button>
              <button
                type="button"
                onClick={exportAccountantCsv}
                className={`flex items-center gap-2 w-full text-start px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <FileDown size={16} /> خروجی حسابدار
              </button>
              <button
                type="button"
                onClick={() => setListPrintOpen(true)}
                className={`flex items-center gap-2 w-full text-start px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Printer size={16} /> چاپ لیست
              </button>
            </div>
          </details>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium shrink-0">
            <Plus size={18} /> مشتری جدید
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'کل (بدون آرشیو)', value: customers.filter((c) => !c.archived_at).length, color: textColor },
          { label: 'راکد ۹۰ روز', value: dormantIds.size, color: 'text-amber-400' },
          { label: 'ارزش بالا (≥ میانه خرید)', value: customers.filter((c) => !c.archived_at && purchaseMedian > 0 && c.total_purchases >= purchaseMedian).length, color: 'text-indigo-400' },
          { label: 'مشتریان فعال', value: customers.filter(c => c.status === 'active' && !c.archived_at).length, color: 'text-emerald-400' },
          { label: 'جمع بدهکاری', value: formatPrice(totalDebt), color: 'text-rose-400' },
          { label: 'جمع بستانکاری', value: formatPrice(totalCredit), color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className={`${cardBg} p-4 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className={`${subText} text-xs mt-1`}>{s.label}</p>
          </div>
        ))}
      </div>

      <details className={`group ${cardBg} p-4 rounded-xl border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <summary className={`cursor-pointer text-sm font-bold ${textColor} list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden`}>
          <span>یادداشت برای مدیر (محدودیت‌ها و تکرارها)</span>
          <ChevronDown size={18} className={`${subText} shrink-0 opacity-70 group-open:rotate-180 transition-transform`} />
        </summary>
        <ul className={`${subText} text-xs space-y-1.5 leading-relaxed list-disc pr-5 mt-3`}>
          <li>
            <span className="text-amber-500 font-semibold">تکرار نسبی:</span> خروجی‌ها (چاپ، CSV حسابدار، واردات) در منوی «خروجی و واردات» جمع شده‌اند؛ هرکدام هدف جدا دارد.
          </li>
          <li>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">کمبودهای متداول:</span> CRM کامل سرور، پیامک/ایمیل انبوه با صف، و تاریخچهٔ تماس خودکار برای هر مشتری در این لایه کامل نیست.
          </li>
          <li>
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>آرشیو:</span> حذف فیزیکی نیست؛ ادغام تکراری و نگهداری داده را با مدیر هماهنگ کنید.
          </li>
        </ul>
      </details>

      <div
        className={`${cardBg} p-4 flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center border ${isDark ? 'border-white/10' : 'border-slate-200'}`}
      >
        <div className="flex flex-col gap-1 shrink-0">
          <span className={`${subText} text-xs`}>کد کشور واتساپ</span>
          <select
            value={waDialCode}
            onChange={(e) => setWaDialCode(e.target.value)}
            className={`${inputClass} max-w-[200px] py-2 text-xs`}
          >
            <option value="93">افغانستان (+93)</option>
            <option value="98">ایران (+98)</option>
            <option value="92">پاکستان (+92)</option>
            <option value="966">عربستان (+966)</option>
            <option value="971">امارات (+971)</option>
            <option value="">خالی — فقط ارقام ذخیره‌شده</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0">
          <input type="checkbox" checked={hideArchived} onChange={(e) => setHideArchived(e.target.checked)} className="rounded border-slate-500" />
          <span className={subText}>پنهان کردن آرشیو</span>
        </label>
        <details className={`group w-full sm:flex-1 sm:min-w-[12rem] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          <summary className="cursor-pointer text-xs font-medium list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
            <span className={subText}>توضیح کوتاه نقش این صفحه</span>
            <ChevronDown size={14} className="opacity-60 group-open:rotate-180 transition-transform" />
          </summary>
          <p className={`text-xs ${subText} mt-2 leading-relaxed max-w-2xl`}>
            {embedInHub
              ? 'پرونده، یادآوری، واتساپ/ایمیل و آرشیو اینجاست؛ معاملات، وظایف و RFM در تب‌های بالا.'
              : 'پرونده و یادآوری محلی و تماس از دستگاه؛ Pipeline کامل سرور اینجا نیست. بکاپ در تب بکاپ.'}
          </p>
        </details>
      </div>

      <div className={`${cardBg} p-4 space-y-3 border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="relative flex items-center">
          <Search size={16} className="absolute right-3 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو: نام، موبایل، کد…"
            className={`${inputClass} pr-10 w-full ${supported ? 'pl-10' : ''}`}
          />
          {supported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`absolute left-2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'}`}
              title={isListening ? 'توقف جستجوی صوتی' : 'جستجوی صوتی'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>
        <div>
          <p className={`${subText} text-[11px] font-semibold mb-2`}>فیلتر سریع</p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', 'همه'],
                ['active', 'فعال'],
                ['archived', 'آرشیو'],
                ['debtor', 'بدهکار'],
                ['creditor', 'بستانکار'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === v
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDark
                      ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <details className="group">
          <summary
            className={`cursor-pointer list-none text-[11px] font-semibold flex items-center gap-1 w-fit [&::-webkit-details-marker]:hidden ${subText}`}
          >
            فیلترهای بیشتر
            <ChevronDown size={14} className="opacity-70 group-open:rotate-180 transition-transform" />
          </summary>
          <div className={`flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-dashed ${isDark ? 'border-white/15' : 'border-slate-200'}`}>
            {(
              [
                ['inactive', 'غیرفعال'],
                ['reminder', 'یادآوری'],
                ['dormant', 'راکد ۹۰روز'],
                ['high_value', 'ارزش بالا'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === v
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDark
                      ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </details>
      </div>

      {/* Table / کارت موبایل */}
      <div className={`${cardBg} overflow-hidden`}>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`${isDark ? 'bg-slate-800/50 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}`}>
                {['کد', 'نام مشتری', 'موبایل', 'تماس', 'موجودی حساب', 'کل خرید', 'یادآوری', 'وضعیت', 'عملیات'].map(h => (
                  <th key={h} className={`text-right ${subText} font-medium py-3 px-4 whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {filtered.map(c => (
                <tr key={c.id} className={isDark ? 'table-row-hover cursor-pointer' : 'hover:bg-slate-50 transition-colors cursor-pointer'}>
                  <td className={`py-3 px-4 ${subText} text-xs font-mono`}>{c.customer_code}</td>
                  <td className="py-3 px-4" onClick={() => setHistoryCustomer(c)}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-white text-xs font-bold">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className={`${textColor} font-medium hover:text-indigo-400 flex items-center gap-1`}>{c.name} <ChevronRight size={12} className="text-slate-500" /></p>
                        {c.address && <p className={`${subText} text-xs truncate max-w-28`}>{c.address}</p>}
                      </div>
                    </div>
                  </td>
                  <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-600'} font-mono text-xs`}>{c.phone}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      {c.whatsapp && <span className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30"><MessageCircle size={10} /> WA</span>}
                      {c.email && <span className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30"><Mail size={10} /></span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-bold text-sm ${c.balance < 0 ? 'text-rose-400' : c.balance > 0 ? 'text-emerald-400' : subText}`}>
                        {c.balance < 0 ? `${formatPrice(Math.abs(c.balance))} بدهکار` : c.balance > 0 ? `${formatPrice(c.balance)} بستانکار` : 'تسویه'}
                      </span>
                      {debtSyncWarnings.has(c.id) && (
                        <span title="ماندهٔ حساب با جمع قرض‌های باز هم‌خوان نیست" className="text-amber-500 inline-flex shrink-0">
                          <AlertTriangle size={15} strokeWidth={2.25} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{formatPrice(c.total_purchases)}</td>
                  <td className="py-3 px-4">
                    {c.reminder_enabled
                      ? <span className="flex items-center gap-1 text-xs text-amber-400"><Bell size={12} /> {c.reminder_days_before} روز قبل</span>
                      : <span className="flex items-center gap-1 text-xs text-slate-600"><BellOff size={12} /> غیرفعال</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full w-fit ${c.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                        {c.status === 'active' ? 'فعال' : 'غیرفعال'}
                      </span>
                      {c.archived_at && <span className="text-[10px] text-amber-400">آرشیو</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => setHistoryCustomer(c)} title="سوابق" className="p-1.5 rounded-lg glass text-slate-400 hover:text-purple-400 transition-colors"><Eye size={14} /></button>
                      <button onClick={() => openEdit(c)} title="ویرایش" className="p-1.5 rounded-lg glass text-slate-400 hover:text-blue-400 transition-colors"><Edit2 size={14} /></button>
                      {!c.archived_at && (
                        <button type="button" onClick={() => { setMergePrimary(c); setMergeRemoveId(0); }} title="ادغام با مشتری دیگر" className="p-1.5 rounded-lg glass text-slate-400 hover:text-cyan-400 transition-colors"><GitMerge size={14} /></button>
                      )}
                      {c.archived_at && (
                        <button type="button" onClick={() => updateCustomer({ ...c, archived_at: undefined, status: 'active' })} title="بازگردانی از آرشیو" className="p-1.5 rounded-lg glass text-slate-400 hover:text-emerald-400 transition-colors"><RotateCcw size={14} /></button>
                      )}
                      {(c.whatsapp || c.phone || c.email) && (
                        <button onClick={() => setMsgCustomer(c)} title="واتساپ / ایمیل" className="p-1.5 rounded-lg glass text-slate-400 hover:text-green-400 transition-colors"><Send size={14} /></button>
                      )}
                      {!c.archived_at && (
                        <button onClick={() => setDeleteItem(c)} title="آرشیو" className="p-1.5 rounded-lg glass text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden p-3 space-y-3">
          {filtered.map(c => (
            <div
              key={c.id}
              className={`rounded-2xl p-4 border ${
                isDark ? 'bg-slate-800/70 border-white/10' : 'bg-slate-50/90 border-slate-200 shadow-sm'
              }`}
            >
              <button
                type="button"
                onClick={() => setHistoryCustomer(c)}
                className="w-full flex gap-3 text-right"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 flex items-center justify-center text-white text-base font-bold shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-[15px] ${textColor} flex items-center gap-1`}>
                    {c.name}
                    <ChevronRight size={14} className={subText} />
                  </p>
                  <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{c.phone}</p>
                  {c.address && <p className={`text-[11px] ${subText} truncate mt-1`}>{c.address}</p>}
                  <p className={`text-[10px] font-mono ${subText} mt-1`}>{c.customer_code}</p>
                </div>
              </button>
              <div className={`mt-3 pt-3 border-t space-y-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="flex justify-between items-center text-sm gap-2">
                  <span className={subText}>حساب</span>
                  <span className="inline-flex items-center gap-1 font-bold tabular-nums">
                    <span
                      className={
                        c.balance < 0 ? 'text-rose-500' : c.balance > 0 ? 'text-emerald-600' : subText
                      }
                    >
                      {c.balance < 0
                        ? `${formatPrice(Math.abs(c.balance))} بدهکار`
                        : c.balance > 0
                          ? `${formatPrice(c.balance)} بستانکار`
                          : 'تسویه'}
                    </span>
                    {debtSyncWarnings.has(c.id) && (
                      <span title="مانده با قرض‌های باز هم‌خوان نیست" className="text-amber-500">
                        <AlertTriangle size={14} strokeWidth={2.25} />
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={subText}>خرید کل</span>
                  <span className={`tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {formatPrice(c.total_purchases)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {c.reminder_enabled ? (
                    <span className="flex items-center gap-1 text-[11px] text-amber-600">
                      <Bell size={12} /> {c.reminder_days_before} روز قبل
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 text-[11px] ${subText}`}>
                      <BellOff size={12} /> یادآوری خاموش
                    </span>
                  )}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${c.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                    {c.status === 'active' ? 'فعال' : 'غیرفعال'}
                  </span>
                  <div className="flex gap-1 mr-auto">
                    {c.whatsapp && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-600">WA</span>
                    )}
                    {c.email && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600">@</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 justify-end flex-wrap">
                <button
                  type="button"
                  onClick={() => setHistoryCustomer(c)}
                  title="سوابق"
                  className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-slate-500`}
                >
                  <Eye size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  title="ویرایش"
                  className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-slate-500`}
                >
                  <Edit2 size={16} />
                </button>
                {(c.whatsapp || c.phone || c.email) && (
                  <button
                    type="button"
                    onClick={() => setMsgCustomer(c)}
                    title="پیام"
                    className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-green-600`}
                  >
                    <Send size={16} />
                  </button>
                )}
                {!c.archived_at && (
                  <button
                    type="button"
                    onClick={() => { setMergePrimary(c); setMergeRemoveId(0); }}
                    title="ادغام"
                    className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-cyan-500`}
                  >
                    <GitMerge size={16} />
                  </button>
                )}
                {c.archived_at && (
                  <button
                    type="button"
                    onClick={() => updateCustomer({ ...c, archived_at: undefined, status: 'active' })}
                    title="بازگردانی"
                    className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-emerald-600`}
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
                {!c.archived_at && (
                  <button
                    type="button"
                    onClick={() => setDeleteItem(c)}
                    title="آرشیو"
                    className={`p-2 rounded-xl ${isDark ? 'glass' : 'bg-white border border-slate-200'} text-rose-500`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        size="lg"
        title={editItem ? 'ویرایش مشتری' : 'مشتری جدید'}
        footer={
          <div className="flex gap-3">
            <button type="submit" form="customer-add-edit-form" className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-semibold text-white">
              {editItem ? 'ذخیره' : 'ثبت مشتری'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-5 py-2.5 text-sm text-slate-300 glass hover:text-white">
              انصراف
            </button>
          </div>
        }
      >
            <form id="customer-add-edit-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block">نام کامل <span className="text-rose-400">*</span></label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block"><Phone size={11} className="inline ml-1" />شماره موبایل <span className="text-rose-400">*</span></label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block"><MessageCircle size={11} className="inline ml-1 text-green-400" />واتساپ <span className="text-slate-500">(اختیاری)</span></label>
                  <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} className={inputClass} placeholder="07xxxxxxx" />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block"><Mail size={11} className="inline ml-1 text-blue-400" />ایمیل <span className="text-slate-500">(اختیاری)</span></label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs mb-1 block"><MapPin size={11} className="inline ml-1" />آدرس</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputClass} />
                </div>
                <div className="col-span-2 flex items-center justify-between bg-slate-500/10 border border-white/10 rounded-xl px-4 py-3">
                  <span className="text-slate-300 text-sm">رضایت بازاریابی (پیامک/ایمیل از اپ دستگاه)</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, marketing_consent: !form.marketing_consent })}
                    className={`w-10 h-5 rounded-full transition-all relative ${form.marketing_consent ? 'bg-emerald-600' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.marketing_consent ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-amber-300 text-sm font-medium flex items-center gap-2"><Bell size={14} /> یادآوری خودکار بدهی</label>
                  <button type="button" onClick={() => setForm({ ...form, reminder_enabled: !form.reminder_enabled })}
                    className={`w-10 h-5 rounded-full transition-all relative ${form.reminder_enabled ? 'bg-amber-500' : 'bg-slate-600'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.reminder_enabled ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                {form.reminder_enabled && (
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">چند روز قبل از سررسید یادآوری شود؟</label>
                    <input type="number" min="1" max="30" value={form.reminder_days_before}
                      onChange={e => setForm({ ...form, reminder_days_before: +e.target.value })}
                      className={inputClass} />
                  </div>
                )}
                {(form.whatsapp || form.email) && (
                  <p className="text-amber-400/70 text-xs">✓ یادآوری از طریق {form.whatsapp ? 'واتساپ' : ''}{form.whatsapp && form.email ? ' و ' : ''}{form.email ? 'ایمیل' : ''} ارسال خواهد شد</p>
                )}
              </div>
            </form>
      </FormModal>

      {listPrintOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass-dark w-full max-w-sm rounded-2xl border border-white/10 p-5 shadow-2xl">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <Printer size={16} className="text-indigo-400" /> انتخاب سایز چاپ لیست
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['58mm', '80mm', 'A5', 'A4'] as PrintSize[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setListPrintSize(s)}
                  className={`py-2.5 rounded-xl text-xs font-bold ${listPrintSize === s ? 'bg-indigo-600 text-white' : 'glass text-slate-400'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setListPrintOpen(false)} className="flex-1 glass text-slate-300 py-2.5 rounded-xl text-sm">
                انصراف
              </button>
              <button type="button" onClick={() => void handlePrintAll()} className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-bold">
                چاپ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {historyCustomer && (
        <CustomerHistoryModal
          customer={historyCustomer}
          invoices={invoices}
          debts={debts}
          formatMoney={(n) => formatPrice(n)}
          onClose={() => setHistoryCustomer(null)}
        />
      )}
      {msgCustomer && (
        <SendMessageModal
          customer={msgCustomer}
          dialCode={waDialCode}
          formatPrice={formatPrice}
          onClose={() => setMsgCustomer(null)}
        />
      )}
      {deleteItem && <DeleteConfirmModal name={deleteItem.name} onConfirm={doDelete} onClose={() => setDeleteItem(null)} />}
      {mergePrimary && (
        <FormModal
          open
          onClose={() => { setMergePrimary(null); setMergeRemoveId(0); }}
          title={`ادغام: نگه‌داشتن «${mergePrimary.name}»`}
          size="md"
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-bold"
                onClick={() => {
                  if (!mergeRemoveId || mergeRemoveId === mergePrimary.id) {
                    window.alert('مشتری دوم را انتخاب کنید.');
                    return;
                  }
                  if (!window.confirm('فاکتورها و بدهی‌ها به مشتری نگه‌داشته‌شده منتقل می‌شود. ادامه؟')) return;
                  const ok = mergeCustomers(mergePrimary.id, mergeRemoveId);
                  setMergePrimary(null);
                  setMergeRemoveId(0);
                  if (!ok) window.alert('ادغام انجام نشد.');
                }}
              >
                تأیید ادغام
              </button>
              <button type="button" className="px-4 glass rounded-xl text-sm" onClick={() => { setMergePrimary(null); setMergeRemoveId(0); }}>
                انصراف
              </button>
            </div>
          }
        >
          <p className="text-slate-400 text-sm mb-3">مشتری دوم حذف می‌شود؛ مانده و خرید کل جمع می‌شود.</p>
          <label className="text-slate-400 text-xs block mb-1">ادغام با</label>
          <select
            className={inputClass}
            value={mergeRemoveId || ''}
            onChange={(e) => setMergeRemoveId(Number(e.target.value))}
          >
            <option value="">— انتخاب —</option>
            {customers
              .filter((c) => c.id !== mergePrimary.id && !c.archived_at)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_code} — {c.name} ({c.phone})
                </option>
              ))}
          </select>
        </FormModal>
      )}
    </div>
  );
}
