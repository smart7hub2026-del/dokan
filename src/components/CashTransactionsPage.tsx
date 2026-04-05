import { useMemo, useState, type FormEvent } from 'react';
import { Banknote, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import type { PartyCashEntry } from '../store/useStore';
import { useToast } from './Toast';

type PartyFilter = 'all' | 'supplier' | 'customer';

export default function CashTransactionsPage() {
  const { isDark } = useApp();
  const { success } = useToast();
  const partyCashLedger = useStore((s) => s.partyCashLedger);
  const addPartyCashEntry = useStore((s) => s.addPartyCashEntry);
  const currentUser = useStore((s) => s.currentUser);
  const suppliers = useStore((s) => s.suppliers);
  const customers = useStore((s) => s.customers);

  const [filter, setFilter] = useState<PartyFilter>('all');
  const [partyKind, setPartyKind] = useState<'supplier' | 'customer'>('supplier');
  const [partyId, setPartyId] = useState('');
  const [flow, setFlow] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'glass border border-white/10' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';
  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:border-indigo-500 outline-none';

  const rows = useMemo(() => {
    const list = partyCashLedger
      .filter((e) => {
        if (filter === 'all') return true;
        return e.party_kind === filter;
      })
      .slice()
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.id - a.id);
    return list;
  }, [partyCashLedger, filter]);

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const pid = Number(partyId);
    const amt = Number(amount);
    if (!Number.isFinite(pid) || pid <= 0 || !Number.isFinite(amt) || amt <= 0) return;

    let name = '';
    if (partyKind === 'supplier') {
      const s = suppliers.find((x) => x.id === pid);
      if (!s) return;
      name = s.company_name;
    } else {
      const c = customers.find((x) => x.id === pid);
      if (!c) return;
      name = c.name;
    }

    addPartyCashEntry({
      party_kind: partyKind,
      party_id: pid,
      party_name_snapshot: name,
      flow,
      amount: amt,
      reason: reason.trim() || '—',
      invoice_ref: invoiceRef.trim(),
      entry_date: entryDate,
      created_by: currentUser?.full_name,
    });
    success('ثبت شد', 'معامله نقدی در تاریخچه ذخیره شد.');
    setAmount('');
    setReason('');
    setInvoiceRef('');
  };

  const flowLabel = (e: PartyCashEntry) => {
    if (e.party_kind === 'supplier') {
      return e.flow === 'cash_out' ? 'پرداخت به تأمین‌کننده' : 'دریافت از تأمین‌کننده';
    }
    return e.flow === 'cash_in' ? 'دریافت از مشتری' : 'پرداخت به مشتری';
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className={`text-2xl font-bold ${textColor} flex items-center gap-2`}>
          <Banknote className="text-emerald-400" size={26} />
          معاملات نقدی
        </h1>
        <p className={`${subText} text-sm mt-1`}>
          ثبت و تاریخچهٔ پرداخت/دریافت نقد نسبت به تأمین‌کنندگان و مشتریان (بدون تغییر خودکار ماندهٔ حساب).
        </p>
      </div>

      <div className={`${cardBg} p-5 space-y-4`}>
        <h2 className={`text-sm font-bold ${textColor} flex items-center gap-2`}>
          <Plus size={16} className="text-indigo-400" />
          ثبت معامله جدید
        </h2>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={`${subText} text-xs block mb-1`}>نوع طرف</label>
            <select
              value={partyKind}
              onChange={(e) => {
                setPartyKind(e.target.value as 'supplier' | 'customer');
                setPartyId('');
              }}
              className={inputClass}
            >
              <option value="supplier">تأمین‌کننده</option>
              <option value="customer">مشتری</option>
            </select>
          </div>
          <div>
            <label className={`${subText} text-xs block mb-1`}>{partyKind === 'supplier' ? 'تأمین‌کننده' : 'مشتری'}</label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">— انتخاب —</option>
              {partyKind === 'supplier'
                ? suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.company_name} ({s.supplier_code})
                    </option>
                  ))
                : customers.filter((c) => !c.archived_at).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customer_code})
                    </option>
                  ))}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            {partyKind === 'supplier' ? (
              <>
                <button
                  type="button"
                  onClick={() => setFlow('cash_out')}
                  className={`flex-1 min-w-[10rem] py-2 rounded-xl text-xs font-bold border ${
                    flow === 'cash_out'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                      : isDark
                        ? 'border-white/10 text-slate-400'
                        : 'border-slate-200 text-slate-600'
                  }`}
                >
                  پرداخت نقد به تأمین‌کننده
                </button>
                <button
                  type="button"
                  onClick={() => setFlow('cash_in')}
                  className={`flex-1 min-w-[10rem] py-2 rounded-xl text-xs font-bold border ${
                    flow === 'cash_in'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                      : isDark
                        ? 'border-white/10 text-slate-400'
                        : 'border-slate-200 text-slate-600'
                  }`}
                >
                  دریافت نقد از تأمین‌کننده
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setFlow('cash_in')}
                  className={`flex-1 min-w-[10rem] py-2 rounded-xl text-xs font-bold border ${
                    flow === 'cash_in'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                      : isDark
                        ? 'border-white/10 text-slate-400'
                        : 'border-slate-200 text-slate-600'
                  }`}
                >
                  دریافت نقد از مشتری
                </button>
                <button
                  type="button"
                  onClick={() => setFlow('cash_out')}
                  className={`flex-1 min-w-[10rem] py-2 rounded-xl text-xs font-bold border ${
                    flow === 'cash_out'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                      : isDark
                        ? 'border-white/10 text-slate-400'
                        : 'border-slate-200 text-slate-600'
                  }`}
                >
                  پرداخت نقد به مشتری
                </button>
              </>
            )}
          </div>
          <div>
            <label className={`${subText} text-xs block mb-1`}>مبلغ (؋)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              dir="ltr"
              required
            />
          </div>
          <div>
            <label className={`${subText} text-xs block mb-1`}>تاریخ</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={`${subText} text-xs block mb-1`}>علت / توضیح</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="مثلاً پیش‌پرداخت، تسویه" />
          </div>
          <div className="md:col-span-2">
            <label className={`${subText} text-xs block mb-1`}>شماره فاکتور مرتبط (اختیاری)</label>
            <input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} className={`${inputClass} font-mono`} dir="ltr" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary w-full md:w-auto text-white px-6 py-2.5 rounded-xl text-sm font-bold">
              ثبت معامله
            </button>
          </div>
        </form>
      </div>

      <div className={`${cardBg} p-4 flex flex-wrap gap-2`}>
        {(
          [
            ['all', 'همه'],
            ['supplier', 'تأمین‌کنندگان'],
            ['customer', 'مشتریان'],
          ] as const
        ).map(([k, lab]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === k ? 'bg-indigo-600 text-white' : isDark ? 'glass text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {lab}
          </button>
        ))}
      </div>

      <div className={`${cardBg} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className={isDark ? 'bg-slate-800/50 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}>
                {['تاریخ', 'طرف', 'نوع', 'جهت', 'مبلغ (؋)', 'علت', 'فاکتور', 'ثبت‌کننده'].map((h) => (
                  <th key={h} className={`text-right py-3 px-3 text-xs font-semibold ${subText}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-slate-100'}>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`py-12 text-center ${subText}`}>
                    هنوز معامله‌ای ثبت نشده است.
                  </td>
                </tr>
              ) : (
                rows.map((e) => (
                  <tr key={e.id} className={isDark ? 'table-row-hover' : ''}>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-300">{e.entry_date}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-white font-medium text-xs">{e.party_name_snapshot}</span>
                      <span className={`block text-[10px] ${subText}`}>
                        {e.party_kind === 'supplier' ? 'تأمین‌کننده' : 'مشتری'} · #{e.party_id}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs">{e.party_kind === 'supplier' ? 'تأمین' : 'مشتری'}</td>
                    <td className="py-2.5 px-3 text-xs">{flowLabel(e)}</td>
                    <td className="py-2.5 px-3 font-bold tabular-nums text-emerald-400">{e.amount.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-400 max-w-[200px]">{e.reason}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{e.invoice_ref || '—'}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">{e.created_by || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
