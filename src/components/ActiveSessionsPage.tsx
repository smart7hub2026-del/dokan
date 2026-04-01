import { useEffect, useState } from 'react';
import { Monitor, Trash2, ShieldAlert, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiDeleteAllUserSessions, apiDeleteUserSession, apiGetUserSessions, type UserSessionRow } from '../services/api';

export default function ActiveSessionsPage({ embedded = false }: { embedded?: boolean }) {
  const authToken = useStore((s) => s.authToken);
  const logout = useStore((s) => s.logout);
  const [rows, setRows] = useState<UserSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await apiGetUserSessions(authToken);
      setRows(res.sessions || []);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا در بارگذاری نشست‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [authToken]);

  const removeOne = async (id: number, isCurrent: boolean) => {
    if (!authToken) return;
    setBusy(true);
    try {
      await apiDeleteUserSession(id, authToken);
      if (isCurrent) logout();
      else await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا در خروج نشست');
    } finally {
      setBusy(false);
    }
  };

  const logoutAll = async () => {
    if (!authToken) return;
    setBusy(true);
    try {
      await apiDeleteAllUserSessions(authToken);
      logout();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا در خروج همه نشست‌ها');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {embedded ? (
            <>
              <h2 className="text-lg font-bold text-white">نشست‌های فعال</h2>
              <p className="text-slate-400 text-xs mt-1">مدیریت دستگاه‌های واردشده به حساب</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">نشست‌های فعال</h1>
              <p className="text-slate-400 text-sm mt-1">مدیریت دستگاه‌های واردشده به حساب</p>
            </>
          )}
        </div>
        <button
          type="button"
          disabled={busy || loading || rows.length === 0}
          onClick={() => void logoutAll()}
          className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600/80 px-4 py-3 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-60 sm:w-auto sm:py-2.5"
        >
          <LogOut size={18} className="shrink-0" />
          خروج از همه دستگاه‌ها
        </button>
      </div>
      {err ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-300 text-sm">{err}</div>
      ) : null}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-center py-10 text-slate-400">در حال بارگذاری...</p>
        ) : rows.length === 0 ? (
          <p className="text-center py-10 text-slate-500">نشست فعالی یافت نشد.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-bold flex flex-wrap items-center gap-2">
                    <Monitor size={14} className="text-indigo-300 shrink-0" />
                    {s.device_name || 'Unknown device'}
                    {s.is_current ? <span className="text-[10px] px-2 py-0.5 rounded-full badge-green">این دستگاه</span> : null}
                  </p>
                  <p className="text-slate-400 text-xs mt-1 break-all">
                    IP: {s.ip_address || '—'} | آخرین فعالیت: {String(s.last_activity_at || '').slice(0, 19).replace('T', ' ')}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-1 break-all line-clamp-2">{s.user_agent || ''}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeOne(s.id, s.is_current)}
                  className="w-full shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-rose-300 hover:bg-rose-500/20 text-xs font-bold disabled:opacity-60 sm:w-auto sm:py-2"
                >
                  <span className="inline-flex items-center justify-center gap-1.5 w-full">
                    <Trash2 size={13} /> خروج از این نشست
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200 text-xs flex items-start gap-2">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
        در صورت مشاهده دستگاه ناشناس، همان نشست را حذف یا از همه دستگاه‌ها خارج شوید.
      </div>
    </div>
  );
}
