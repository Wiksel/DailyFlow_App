export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'auth/invalid-credential',
  WRONG_PASSWORD: 'auth/wrong-password',
  TOO_MANY_REQUESTS: 'auth/too-many-requests',
  EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
  WEAK_PASSWORD: 'auth/weak-password',
  INVALID_EMAIL: 'auth/invalid-email',
  USER_NOT_FOUND: 'auth/user-not-found',
  NETWORK_REQUEST_FAILED: 'auth/network-request-failed',
  CREDENTIAL_ALREADY_IN_USE: 'auth/credential-already-in-use',
} as const;

export const ERROR_MESSAGES = {
  [AUTH_ERRORS.INVALID_CREDENTIALS]: 'Nieprawidłowe dane logowania.\nSprawdź identyfikator i hasło.',
  [AUTH_ERRORS.WRONG_PASSWORD]: 'Nieprawidłowe dane logowania.\nSprawdź identyfikator i hasło.',
  [AUTH_ERRORS.TOO_MANY_REQUESTS]: 'Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut.',
  [AUTH_ERRORS.EMAIL_ALREADY_IN_USE]: 'Ten adres e-mail jest już używany.',
  [AUTH_ERRORS.WEAK_PASSWORD]: 'Hasło jest zbyt słabe. Użyj min. 6 znaków, w tym cyfry i litery.',
  [AUTH_ERRORS.INVALID_EMAIL]: 'Podany adres e-mail jest nieprawidłowy.',
  [AUTH_ERRORS.USER_NOT_FOUND]: 'Nie znaleziono użytkownika z tymi danymi.',
  [AUTH_ERRORS.NETWORK_REQUEST_FAILED]: 'Problem z połączeniem sieciowym. Sprawdź połączenie z internetem.',
  [AUTH_ERRORS.CREDENTIAL_ALREADY_IN_USE]: 'To konto jest już połączone z innym kontem Google.',
  DEFAULT: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
} as const;

export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: 'To pole jest wymagane.',
  INVALID_EMAIL: 'Podaj poprawny adres e-mail.',
  WEAK_PASSWORD: 'Hasło musi mieć co najmniej 6 znaków i zawierać literę i cyfrę.',
  SHORT_NICKNAME: 'Nick musi mieć co najmniej 2 znaki.',
  REQUIRED_NICKNAME: 'Nick jest wymagany.',
  REQUIRED_PASSWORD: 'Hasło jest wymagane.',
  REQUIRED_EMAIL: 'Adres e-mail jest wymagany.',
} as const;

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Zalogowano pomyślnie!',
  REGISTER_SUCCESS: 'Konto zostało utworzone!',
  LOGOUT_SUCCESS: 'Wylogowano pomyślnie!',
  ACCOUNTS_LINKED: 'Konta zostały połączone pomyślnie!',
  VERIFICATION_SENT: 'Link weryfikacyjny został wysłany!',
} as const;

export const INFO_MESSAGES = {
  LOGIN_CANCELLED: 'Logowanie anulowane.',
  CHECK_EMAIL: 'Sprawdź swoją skrzynkę e-mail (również folder spam).',
  VERIFICATION_REQUIRED: 'Kliknij link weryfikacyjny, aby dokończyć rejestrację.',
} as const;