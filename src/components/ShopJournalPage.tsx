import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  CreditCard,
  ChevronLeft,
  Newspaper,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useApp } from '../context/AppContext';
import { bookToProductForSale } from '../utils/bookInventory';

type JournalKind = 'sale' | 'customer' | 'debt' | 'stock';

interface JournalRow {
  id: string;
  sortKey: string;
  kind: JournalKind;
  title: string;
  sub?: string;
  badge?: string;
  href: string;
}

export default function ShopJournalPage() {
  const { t, isDark, formatPrice } = useApp();
  const navigate = useNavigate();
  const invoices = useStore((s) => s.invoices);
  const customers = useStore((s) => s.customers);
  const debts = useStore((s) => s.debts);
  const products = useStore((s) => s.products);
  const books = useStore((s) => s.books);
  const shopSettings = useStore((s) => s.shopSettings);

  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subText = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'glass rounded-2xl border border-white/10' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';

  const isBookstore = shopSettings.business_type === 'bookstore';

  const rows = useMemo(() => {
    const out: JournalRow[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const inv of invoices) {
      const sortKey = `${inv.invoice_date}T12:00:00`;
      out.push({
        id: `inv-${inv.id}`,
        sortKey,
        kind: 'sale',
        title: `${inv.invoice_number} — ${inv.customer_name}`,
        sub: `${formatPrice(inv.total)} · ${inv.payment_method === 'credit' ? 'نسیه' : 'نقدی'}`,
        badge: inv.invoice_date,
        href: '/invoices',
      });
    }

    for (const c of customers) {
      const d = c.created_at || '';
      out.push({
        id: `cust-${c.id}`,
        sortKey: d.length >= 10 ? `${d.slice(0, 10)}T10:00:00` : '1970-01-01',
        kind: 'customer',
        title: c.name,
        sub: c.customer_code,
        badge: d.slice(0, 10) || '—',
        href: '/customers',
      });
    }

    for (const d of debts) {
      if (d.remaining_amount <= 0) continue;
      const due = d.due_date ? new Date(d.due_date) : null;
      if (due) due.setHours(0, 0, 0, 0);
      const overdue = due != null && due < today;
      out.push({
        id: `debt-${d.id}`,
        sortKey: `${d.created_at || d.due_date || '1970-01-01'}T14:00:00`,
        kind: 'debt',
        title: `${d.customer_name} · ${d.invoice_number}`,
        sub: `${formatPrice(d.remaining_amount)} مانده`,
        badge: overdue ? 'معوق' : d.due_date || '—',
        href: '/debts',
      });
    }

    const lowStock = isBookstore
      ? books.filter((b) => b.stock_shop <= b.min_stock && b.is_active).map(bookToProductForSale)
      : products.filter((p) => p.stock_shop <= p.min_stock && p.is_active);

    const stockDay = new Date().toISOString().slice(0, 10);
    for (const p of lowStock.slice(0, 40)) {
      out.push({
        id: `stock-${p.id}`,
        sortKey: `${stockDay}T08:00:00`,
        kind: 'stock',
        title: p.name,
        sub: `موجودی مغازه ${p.stock_shop} ≤ حد ${p.min_stock}`,
        badge: 'موجودی',
        href: '/reorder-list',
      });
    }

    out.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
    return out.slice(0, 120);
  }, [invoices, customers, debts, products, books, isBookstore, formatPrice]);

  const kindIcon = (k: JournalKind) => {
    switch (k) {
      case 'sale':
        return ShoppingCart;
      case 'customer':
        return Users;
      case 'debt':
        return CreditCard;
      default:
        return Package;
    }
  };

  const kindStyle = (k: JournalKind) => {
    if (k === 'sale') return isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700';
    if (k === 'customer') return isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
    if (k === 'debt') return isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700';
    return isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800';
  };

  return (
    <div className="space-y-5 sm:space-y-6 fade-in max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${textColor} flex items-center gap-2`}>
            <Newspaper size={26} className="text-teal-500 shrink-0" />
            {t('shop_journal')}
          </h1>
          <p className={`${subText} text-sm mt-1`}>{t('shop_journal_subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`shrink-0 flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${
            isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ChevronLeft size={18} />
          بازگشت
        </button>
      </div>

      {rows.length === 0 ? (
        <div className={`${cardBg} p-10 text-center ${subText}`}>
          <p className="text-sm">هنوز رویدادی برای نمایش نیست.</p>
        </div>
      ) : (
        <ul className={`${cardBg} divide-y ${isDark ? 'divide-white/10' : 'divide-slate-100'}`}>
          {rows.map((row) => {
            const Icon = row.kind === 'stock' ? AlertTriangle : kindIcon(row.kind);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => navigate(row.href)}
                  className={`w-full text-right flex items-start gap-3 p-4 transition-colors ${
                    isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kindStyle(row.kind)}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${textColor} truncate`}>{row.title}</p>
                    {row.sub && <p className={`text-xs mt-0.5 ${subText}`}>{row.sub}</p>}
                  </div>
                  {row.badge && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${subText} ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                      {row.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
