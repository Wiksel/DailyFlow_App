import {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateTaskText,
  validateBudgetAmount,
} from '../validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('validates correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('123@numbers.com')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(validateEmail('user+tag@domain.com')).toBe(true);
      expect(validateEmail('user.name@domain.com')).toBe(true);
      expect(validateEmail('user-name@domain.com')).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('validates strong passwords', () => {
      expect(validatePassword('StrongPass123!')).toBe(true);
      expect(validatePassword('ComplexP@ssw0rd')).toBe(true);
      expect(validatePassword('MyP@ss1!')).toBe(true); // Fixed: added special character
    });

    it('rejects weak passwords', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('123456')).toBe(false);
      expect(validatePassword('password')).toBe(false);
      expect(validatePassword('')).toBe(false);
    });

    it('requires minimum length and complexity', () => {
      expect(validatePassword('Abc123')).toBe(false); // no special char
      expect(validatePassword('Abc!@#')).toBe(false); // no number
      expect(validatePassword('abc123!')).toBe(false); // no uppercase
      expect(validatePassword('ABC123!')).toBe(false); // no lowercase
    });
  });

  describe('validatePhoneNumber', () => {
    it('validates correct phone numbers', () => {
      expect(validatePhoneNumber('+48123456789')).toBe(true);
      expect(validatePhoneNumber('123456789')).toBe(true);
      expect(validatePhoneNumber('+1-555-123-4567')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber('abc')).toBe(false);
      expect(validatePhoneNumber('123')).toBe(false); // too short
      expect(validatePhoneNumber('123456789012345678901')).toBe(false); // too long (21 chars)
    });

    it('handles different formats', () => {
      expect(validatePhoneNumber('+48 123 456 789')).toBe(true);
      expect(validatePhoneNumber('123-456-789')).toBe(true);
      expect(validatePhoneNumber('(123) 456-7890')).toBe(true);
    });
  });

  describe('validateTaskText', () => {
    it('validates correct task text', () => {
      expect(validateTaskText('Complete project')).toBe(true);
      expect(validateTaskText('Buy groceries')).toBe(true);
      expect(validateTaskText('A'.repeat(200))).toBe(true); // max length
    });

    it('rejects invalid task text', () => {
      expect(validateTaskText('')).toBe(false);
      expect(validateTaskText('   ')).toBe(false); // only whitespace
      expect(validateTaskText('A'.repeat(201))).toBe(false); // too long
    });

    it('trims whitespace', () => {
      expect(validateTaskText('  Task with spaces  ')).toBe(true);
    });
  });

  describe('validateBudgetAmount', () => {
    it('validates correct amounts', () => {
      expect(validateBudgetAmount(100)).toBe(true);
      expect(validateBudgetAmount(0.01)).toBe(true);
      expect(validateBudgetAmount(999999.99)).toBe(true);
    });

    it('rejects invalid amounts', () => {
      expect(validateBudgetAmount(-1)).toBe(false);
      expect(validateBudgetAmount(0)).toBe(false);
      expect(validateBudgetAmount(1000000)).toBe(false); // too high
    });

    it('handles decimal precision', () => {
      expect(validateBudgetAmount(100.123)).toBe(false); // too many decimals
      expect(validateBudgetAmount(100.12)).toBe(true);
    });
  });
});
