export const extractDigits = (text: string): string => text.replace(/\D/g, '');

// Formats 9-digit Polish local number as "000 000 000"
export const formatPolishPhone = (digits: string): string => {
  const cleaned = extractDigits(digits).slice(0, 9);
  let formatted = '';
  if (cleaned.length > 0) formatted += cleaned.substring(0, 3);
  if (cleaned.length > 3) formatted += ' ' + cleaned.substring(3, 6);
  if (cleaned.length > 6) formatted += ' ' + cleaned.substring(6, 9);
  return formatted;
};

// Builds E.164 phone number from calling code (e.g. "48") and local digits
export const buildE164 = (callingCode: string, localDigits: string): string =>
  `+${callingCode}${extractDigits(localDigits)}`;




