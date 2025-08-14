export const isValidPolishLocalPhone = (digits: string): boolean => /^(\D*\d\D*){9}$/.test(digits);

// At least 6 chars, 1 letter, 1 digit
export const isStrongPassword = (password: string): boolean => /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password);



