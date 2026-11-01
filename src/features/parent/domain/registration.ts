import type { ParentRegistration } from '@/lib/auth';

export const MIN_PASSWORD = 8;

export interface RegistrationForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
}

export const EMPTY_REGISTRATION: RegistrationForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirm: '',
};

/** Field errors shown as the parent types; null while a field is empty or fine. */
export function registrationErrors(form: RegistrationForm) {
  return {
    password:
      form.password && form.password.length < MIN_PASSWORD
        ? `Use at least ${MIN_PASSWORD} characters.`
        : null,
    confirm: form.confirm && form.confirm !== form.password ? 'Passwords do not match.' : null,
  };
}

/** The form as the backend takes it: trimmed, with no empty phone. */
export const toRegistration = (form: RegistrationForm): ParentRegistration => ({
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  email: form.email.trim(),
  phone: form.phone.trim() || undefined,
  password: form.password,
});
