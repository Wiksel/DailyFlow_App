export interface LoginFormData {
  identifier: string;
  password: string;
}

export interface RegisterFormData {
  nickname: string;
  email: string;
  password: string;
}

export interface FormValidationErrors {
  email?: string;
  password?: string;
  nickname?: string;
  general?: string;
}

export interface FormState<T> {
  data: T;
  errors: FormValidationErrors;
  isLoading: boolean;
  isValid: boolean;
}

export type FormMode = 'login' | 'register';

export interface AuthFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  mode?: FormMode;
}