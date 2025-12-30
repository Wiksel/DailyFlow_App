export const isValidPolishLocalPhone = (digits: string): boolean => /^(\D*\d\D*){9}$/.test(digits);

// At least 6 chars, 1 letter, 1 digit
export const isStrongPassword = (password: string): boolean => /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password);

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation with complexity requirements
export const validatePassword = (password: string): boolean => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
  return true;
};

// Phone number validation
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || phone.length < 9 || phone.length > 20) return false;
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

// Task text validation
export const validateTaskText = (text: string): boolean => {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= 200;
};

// Budget amount validation
export const validateBudgetAmount = (amount: number): boolean => {
  if (amount <= 0 || amount >= 1000000) return false;
  // Check if amount has more than 2 decimal places
  const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
  return decimalPlaces <= 2;
};




