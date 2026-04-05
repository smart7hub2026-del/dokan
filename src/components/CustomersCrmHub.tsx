import { useApp } from '../context/AppContext';
import CustomersPage from './CustomersPage';

/** فقط دایرکتوری مشتریان؛ معاملات نقدی در منوی «معاملات». */
export default function CustomersCrmHub() {
  const { t, isDark } = useApp();
  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className={`text-2xl font-bold ${textColor}`}>{t('customers_crm_hub_title')}</h1>
        <p className={`${subText} text-sm mt-1`}>{t('customers_crm_hub_subtitle')}</p>
      </div>
      <CustomersPage embedInHub />
    </div>
  );
}
