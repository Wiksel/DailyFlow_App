import { validateEmail, validatePassword, validateNickname, validatePhone } from '../../constants/validation';

describe('Validation Functions', () => {
  describe('validateEmail', () => {
    it('should return undefined for valid email', () => {
      expect(validateEmail('test@example.com')).toBeUndefined();
      expect(validateEmail('user.name@domain.co.uk')).toBeUndefined();
    });

    it('should return error message for empty email', () => {
      expect(validateEmail('')).toBe('Adres e-mail jest wymagany.');
      expect(validateEmail('   ')).toBe('Adres e-mail jest wymagany.');
    });

    it('should return error message for invalid email format', () => {
      expect(validateEmail('invalid-email')).toBe('Podaj poprawny adres e-mail.');
      expect(validateEmail('test@')).toBe('Podaj poprawny adres e-mail.');
      expect(validateEmail('@example.com')).toBe('Podaj poprawny adres e-mail.');
    });
  });

  describe('validatePassword', () => {
    it('should return undefined for valid password', () => {
      expect(validatePassword('password123')).toBeUndefined();
      expect(validatePassword('abc123')).toBeUndefined();
    });

    it('should return error message for empty password', () => {
      expect(validatePassword('')).toBe('Hasło jest wymagane.');
      expect(validatePassword('   ')).toBe('Hasło jest wymagane.');
    });

    it('should return error message for too short password', () => {
      expect(validatePassword('123')).toBe('Hasło musi mieć co najmniej 6 znaków.');
    });

    it('should return error message for password without letters', () => {
      expect(validatePassword('123456')).toBe('Hasło musi zawierać literę i cyfrę.');
    });

    it('should return error message for password without digits', () => {
      expect(validatePassword('abcdef')).toBe('Hasło musi zawierać literę i cyfrę.');
    });
  });

  describe('validateNickname', () => {
    it('should return undefined for valid nickname', () => {
      expect(validateNickname('John')).toBeUndefined();
      expect(validateNickname('User123')).toBeUndefined();
      expect(validateNickname('Jan Kowalski')).toBeUndefined();
    });

    it('should return error message for empty nickname', () => {
      expect(validateNickname('')).toBe('Nick jest wymagany.');
      expect(validateNickname('   ')).toBe('Nick jest wymagany.');
    });

    it('should return error message for too short nickname', () => {
      expect(validateNickname('A')).toBe('Nick musi mieć co najmniej 2 znaki.');
    });

    it('should return error message for invalid characters', () => {
      expect(validateNickname('User@123')).toBe('Nick może zawierać tylko litery, cyfry i spacje.');
      expect(validateNickname('User#123')).toBe('Nick może zawierać tylko litery, cyfry i spacje.');
    });
  });

  describe('validatePhone', () => {
    it('should return undefined for valid phone number', () => {
      expect(validatePhone('+48123456789')).toBeUndefined();
      expect(validatePhone('123456789')).toBeUndefined();
      expect(validatePhone('+1 234 567 890')).toBeUndefined();
    });

    it('should return error message for empty phone number', () => {
      expect(validatePhone('')).toBe('To pole jest wymagane.');
      expect(validatePhone('   ')).toBe('To pole jest wymagane.');
    });

    it('should return error message for too short phone number', () => {
      expect(validatePhone('123')).toBe('Podaj poprawny numer telefonu.');
    });

    it('should return error message for invalid characters', () => {
      expect(validatePhone('abc123def')).toBe('Podaj poprawny numer telefonu.');
    });
  });
});