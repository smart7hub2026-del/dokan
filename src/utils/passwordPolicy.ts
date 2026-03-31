export type PasswordRuleCheck = {
  id: 'length' | 'uppercase' | 'number' | 'special';
  label: string;
  ok: boolean;
};

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*]/;

export const evaluatePasswordPolicy = (value: string): PasswordRuleCheck[] => {
  const v = String(value || '');
  return [
    { id: 'length', label: `حداقل ${PASSWORD_MIN_LENGTH} کاراکتر`, ok: v.length >= PASSWORD_MIN_LENGTH },
    { id: 'uppercase', label: 'حداقل یک حرف بزرگ (A-Z)', ok: /[A-Z]/.test(v) },
    { id: 'number', label: 'حداقل یک عدد', ok: /\d/.test(v) },
    { id: 'special', label: 'حداقل یک کاراکتر ویژه (!@#$%^&*)', ok: PASSWORD_SPECIAL_REGEX.test(v) },
  ];
};

export const validatePasswordPolicy = (value: string): string | null => {
  const checks = evaluatePasswordPolicy(value);
  const failed = checks.find((c) => !c.ok);
  return failed ? failed.label : null;
};
