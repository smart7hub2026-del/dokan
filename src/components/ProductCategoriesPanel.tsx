import { useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, FolderTree, ChevronRight } from 'lucide-react';
import type { Category } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import FormModal from './ui/FormModal';

type Props = {
  countInCategory: (categoryId: number) => number;
  entityLabel: string;
};

export default function ProductCategoriesPanel({ countInCategory, entityLabel }: Props) {
  const { isDark, t } = useApp();
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subText = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'glass border border-white/10 rounded-2xl' : 'bg-white border border-slate-200 shadow-sm rounded-2xl';
  const rowBorder = isDark ? 'border-white/10' : 'border-slate-100';

  const [addOpen, setAddOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<number | null>(null);
  const [addName, setAddName] = useState('');

  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);

  const roots = useMemo(
    () =>
      [...categories]
        .filter((c) => !c.parent_id)
        .sort((a, b) => a.name.localeCompare(b.name, 'fa')),
    [categories],
  );

  const childrenOf = (parentId: number) =>
    categories
      .filter((c) => c.parent_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'fa'));

  const subCount = (id: number) => childrenOf(id).length;

  const canDelete = (c: Category) => {
    if (countInCategory(c.id) > 0) return false;
    if (subCount(c.id) > 0) return false;
    return true;
  };

  const openAdd = (parentId: number | null) => {
    setAddParentId(parentId);
    setAddName('');
    setAddOpen(true);
  };

  const submitAdd = () => {
    const n = addName.trim();
    if (!n) return;
    addCategory(n, addParentId);
    setAddOpen(false);
    setAddName('');
  };

  const openEdit = (c: Category) => {
    setEditCat(c);
    setEditName(c.name);
  };

  const submitEdit = () => {
    if (!editCat) return;
    const n = editName.trim();
    if (!n) return;
    updateCategory({ ...editCat, name: n });
    setEditCat(null);
  };

  const doDelete = () => {
    if (!deleteCat) return;
    deleteCategory(deleteCat.id);
    setDeleteCat(null);
  };

  const toggleStatus = (c: Category) => {
    updateCategory({
      ...c,
      status: c.status === 'active' ? 'inactive' : 'active',
    });
  };

  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:border-indigo-500 outline-none';
  const labelClass = isDark ? 'text-slate-400' : 'text-slate-600';
  const footerCancelClass = isDark
    ? 'flex-1 glass text-slate-300 py-2.5 rounded-xl text-sm hover:text-white'
    : 'flex-1 border border-slate-200 bg-white text-slate-700 py-2.5 rounded-xl text-sm hover:bg-slate-50';

  const chip = (c: Category) =>
    c.status === 'active'
      ? isDark
        ? 'bg-emerald-500/15 text-emerald-300'
        : 'bg-emerald-50 text-emerald-700'
      : isDark
        ? 'bg-slate-600/40 text-slate-300'
        : 'bg-slate-100 text-slate-600';

  const renderRow = (c: Category, depth: number) => {
    const cnt = countInCategory(c.id);
    const blocked = !canDelete(c);
    return (
      <div
        key={c.id}
        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-3 px-4 border-b ${rowBorder} last:border-b-0 ${depth > 0 ? 'ps-10' : ''}`}
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {depth > 0 && <ChevronRight size={16} className={`${subText} shrink-0 mt-0.5 rotate-180`} />}
          <FolderTree size={18} className={`shrink-0 mt-0.5 ${subText}`} />
          <div className="min-w-0">
            <p className={`font-semibold text-sm ${textColor}`}>{c.name}</p>
            <p className={`text-xs mt-0.5 ${subText}`}>
              {cnt} {entityLabel}
              {subCount(c.id) > 0 ? ` · ${subCount(c.id)} زیردسته` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${chip(c)}`}>
            {c.status === 'active' ? t('active') : t('inactive')}
          </span>
          <button
            type="button"
            onClick={() => toggleStatus(c)}
            className={`text-xs px-2 py-1 rounded-lg border ${isDark ? 'border-white/15 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {c.status === 'active' ? t('inactive') : t('active')}
          </button>
          {!c.parent_id && (
            <button
              type="button"
              onClick={() => openAdd(c.id)}
              className="text-xs px-2 py-1 rounded-lg bg-indigo-600/90 text-white hover:bg-indigo-600 flex items-center gap-1"
            >
              <Plus size={12} /> زیردسته
            </button>
          )}
          <button
            type="button"
            onClick={() => openEdit(c)}
            title="ویرایش نام"
            className={`p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            disabled={blocked}
            title={
              blocked
                ? countInCategory(c.id) > 0
                  ? `ابتدا ${entityLabel}ها را منتقل کنید`
                  : 'ابتدا زیردسته‌ها را حذف کنید'
                : 'حذف'
            }
            onClick={() => {
              if (!blocked) setDeleteCat(c);
            }}
            className={`p-1.5 rounded-lg ${
              blocked
                ? 'opacity-35 cursor-not-allowed text-slate-500'
                : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${textColor}`}>{t('product_categories_tab')}</h2>
          <p className={`text-sm ${subText} mt-0.5`}>دستهٔ اصلی و زیردسته؛ حذف فقط وقتی مجاز است که خالی باشد.</p>
        </div>
        <button
          type="button"
          onClick={() => openAdd(null)}
          className="btn-primary flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium shrink-0"
        >
          <Plus size={18} /> دستهٔ اصلی جدید
        </button>
      </div>

      <div className={cardBg}>
        {roots.length === 0 ? (
          <p className={`text-sm text-center py-10 ${subText}`}>هنوز دسته‌ای نیست — «دستهٔ اصلی جدید» را بزنید.</p>
        ) : (
          <div>
            {roots.map((r) => (
              <div key={r.id}>
                {renderRow(r, 0)}
                {childrenOf(r.id).map((ch) => renderRow(ch, 1))}
              </div>
            ))}
          </div>
        )}
      </div>

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={addParentId == null ? 'دستهٔ اصلی جدید' : 'زیردستهٔ جدید'}
        size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <button type="button" onClick={() => setAddOpen(false)} className={footerCancelClass}>
              انصراف
            </button>
            <button type="button" onClick={submitAdd} className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-semibold">
              ثبت
            </button>
          </div>
        }
      >
        <label className={`${labelClass} text-xs mb-1 block`}>نام دسته</label>
        <input
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="مثلاً لبنیات"
          className={inputClass}
          autoFocus
        />
      </FormModal>

      <FormModal
        open={Boolean(editCat)}
        onClose={() => setEditCat(null)}
        title="ویرایش نام دسته"
        size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <button type="button" onClick={() => setEditCat(null)} className={footerCancelClass}>
              انصراف
            </button>
            <button type="button" onClick={submitEdit} className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-semibold">
              ذخیره
            </button>
          </div>
        }
      >
        <label className={`${labelClass} text-xs mb-1 block`}>نام</label>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className={inputClass}
        />
      </FormModal>

      {deleteCat && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
          <div className="glass-dark rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} className="text-rose-400" />
            </div>
            <h3 className="text-white font-bold text-base mb-2">حذف «{deleteCat.name}»؟</h3>
            <p className="text-slate-400 text-xs mb-5">فقط در صورت خالی بودن دسته قابل حذف است.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleteCat(null)} className="flex-1 glass text-slate-300 py-2.5 rounded-xl text-sm hover:text-white">
                انصراف
              </button>
              <button type="button" onClick={doDelete} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl text-sm">
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
