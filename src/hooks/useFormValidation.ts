import { useState, useCallback, useMemo } from 'react';
import { FormValidationErrors, LoginFormData, RegisterFormData } from '../types/forms';
import { validateEmail, validatePassword, validateNickname, validatePhone } from '../constants/validation';

interface ValidationRules {
  email?: (value: string) => string | undefined;
  password?: (value: string) => string | undefined;
  nickname?: (value: string) => string | undefined;
  phone?: (value: string) => string | undefined;
}

const defaultValidationRules: ValidationRules = {
  email: validateEmail,
  password: validatePassword,
  nickname: validateNickname,
  phone: validatePhone,
};

export const useFormValidation = <T extends Record<string, any>>(
  initialData: T,
  customRules?: ValidationRules,
) => {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const rules = useMemo(() => ({ ...defaultValidationRules, ...customRules }), [customRules]);

  const validateField = useCallback(
    (field: keyof T, value: string) => {
      const rule = rules[field as keyof ValidationRules];
      if (rule) {
        return rule(value);
      }
      return undefined;
    },
    [rules],
  );

  const validateForm = useCallback(() => {
    const newErrors: FormValidationErrors = {};
    let isValid = true;

    Object.keys(data).forEach((key) => {
      const error = validateField(key as keyof T, data[key]);
      if (error) {
        newErrors[key as keyof FormValidationErrors] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [data, validateField]);

  const setFieldValue = useCallback(
    (field: keyof T, value: string) => {
      setData((prev) => ({ ...prev, [field]: value }));
      
      // Waliduj pole jeśli zostało dotknięte
      if (touched[field as string]) {
        const error = validateField(field, value);
        setErrors((prev) => ({
          ...prev,
          [field]: error,
        }));
      }
    },
    [touched, validateField],
  );

  const setFieldTouched = useCallback(
    (field: keyof T, isTouched = true) => {
      setTouched((prev) => ({ ...prev, [field]: isTouched }));
      
      // Waliduj pole przy pierwszym dotknięciu
      if (isTouched && !touched[field as string]) {
        const error = validateField(field, data[field]);
        setErrors((prev) => ({
          ...prev,
          [field]: error,
        }));
      }
    },
    [touched, data, validateField],
  );

  const resetForm = useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 && Object.keys(data).every((key) => data[key]);
  }, [errors, data]);

  return {
    data,
    errors,
    touched,
    isValid,
    setFieldValue,
    setFieldTouched,
    validateForm,
    resetForm,
  };
};