export const VALIDATION_PATTERNS = {
  EMAIL: /\S+@\S+\.\S+/,
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  NICKNAME: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s]{2,20}$/,
} as const;

export const VALIDATION_LIMITS = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NICKNAME_LENGTH: 2,
  MAX_NICKNAME_LENGTH: 20,
  MIN_EMAIL_LENGTH: 5,
  MAX_EMAIL_LENGTH: 254,
  MIN_PHONE_LENGTH: 9,
  MAX_PHONE_LENGTH: 15,
} as const;

export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: 'Adres e-mail jest wymagany.',
  EMAIL_INVALID: 'Podaj poprawny adres e-mail.',
  PASSWORD_REQUIRED: 'Hasło jest wymagane.',
  PASSWORD_TOO_SHORT: `Hasło musi mieć co najmniej ${VALIDATION_LIMITS.MIN_PASSWORD_LENGTH} znaków.`,
  PASSWORD_TOO_LONG: `Hasło nie może być dłuższe niż ${VALIDATION_LIMITS.MAX_PASSWORD_LENGTH} znaków.`,
  PASSWORD_WEAK: 'Hasło musi zawierać literę i cyfrę.',
  NICKNAME_REQUIRED: 'Nick jest wymagany.',
  NICKNAME_TOO_SHORT: `Nick musi mieć co najmniej ${VALIDATION_LIMITS.MIN_NICKNAME_LENGTH} znaki.`,
  NICKNAME_TOO_LONG: `Nick nie może być dłuższy niż ${VALIDATION_LIMITS.MAX_NICKNAME_LENGTH} znaków.`,
  NICKNAME_INVALID: 'Nick może zawierać tylko litery, cyfry i spacje.',
  PHONE_INVALID: 'Podaj poprawny numer telefonu.',
  FIELD_REQUIRED: 'To pole jest wymagane.',
} as const;

export const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) {
    return VALIDATION_MESSAGES.EMAIL_REQUIRED;
  }
  if (!VALIDATION_PATTERNS.EMAIL.test(email)) {
    return VALIDATION_MESSAGES.EMAIL_INVALID;
  }
  if (email.length < VALIDATION_LIMITS.MIN_EMAIL_LENGTH) {
    return VALIDATION_MESSAGES.EMAIL_INVALID;
  }
  if (email.length > VALIDATION_LIMITS.MAX_EMAIL_LENGTH) {
    return VALIDATION_MESSAGES.EMAIL_INVALID;
  }
  return undefined;
};

export const validatePassword = (password: string): string | undefined => {
  if (!password.trim()) {
    return VALIDATION_MESSAGES.PASSWORD_REQUIRED;
  }
  if (password.length < VALIDATION_LIMITS.MIN_PASSWORD_LENGTH) {
    return VALIDATION_MESSAGES.PASSWORD_TOO_SHORT;
  }
  if (password.length > VALIDATION_LIMITS.MAX_PASSWORD_LENGTH) {
    return VALIDATION_MESSAGES.PASSWORD_TOO_LONG;
  }
  if (!VALIDATION_PATTERNS.PASSWORD.test(password)) {
    return VALIDATION_MESSAGES.PASSWORD_WEAK;
  }
  return undefined;
};

export const validateNickname = (nickname: string): string | undefined => {
  if (!nickname.trim()) {
    return VALIDATION_MESSAGES.NICKNAME_REQUIRED;
  }
  if (nickname.trim().length < VALIDATION_LIMITS.MIN_NICKNAME_LENGTH) {
    return VALIDATION_MESSAGES.NICKNAME_TOO_SHORT;
  }
  if (nickname.length > VALIDATION_LIMITS.MAX_NICKNAME_LENGTH) {
    return VALIDATION_MESSAGES.NICKNAME_TOO_LONG;
  }
  if (!VALIDATION_PATTERNS.NICKNAME.test(nickname)) {
    return VALIDATION_MESSAGES.NICKNAME_INVALID;
  }
  return undefined;
};

export const validatePhone = (phone: string): string | undefined => {
  if (!phone.trim()) {
    return VALIDATION_MESSAGES.FIELD_REQUIRED;
  }
  if (!VALIDATION_PATTERNS.PHONE.test(phone)) {
    return VALIDATION_MESSAGES.PHONE_INVALID;
  }
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < VALIDATION_LIMITS.MIN_PHONE_LENGTH) {
    return VALIDATION_MESSAGES.PHONE_INVALID;
  }
  if (cleanPhone.length > VALIDATION_LIMITS.MAX_PHONE_LENGTH) {
    return VALIDATION_MESSAGES.PHONE_INVALID;
  }
  return undefined;
};