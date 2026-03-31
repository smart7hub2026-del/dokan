import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { evaluatePasswordPolicy } from '../utils/passwordPolicy';

type Props = {
  password: string;
  className?: string;
};

export default function PasswordStrength({ password, className = '' }: Props) {
  const checks = evaluatePasswordPolicy(password);
  const passed = checks.filter((c) => c.ok).length;
  const pct = Math.round((passed / checks.length) * 100);
  const tone = pct < 50 ? 'bg-rose-500' : pct < 100 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {checks.map((rule) => (
          <div key={rule.id} className={`text-[11px] flex items-center gap-1.5 ${rule.ok ? 'text-emerald-400' : 'text-slate-500'}`}>
            {rule.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
