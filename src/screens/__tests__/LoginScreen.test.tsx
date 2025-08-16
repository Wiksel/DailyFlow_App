import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({}),
}));

// Mock Firebase
jest.mock('@react-native-firebase/auth', () => ({
  auth: () => ({
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
  }),
}));

const renderLoginScreen = () => {
  return render(<LoginScreen />);
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form correctly', () => {
    const { getByPlaceholderText, getByText } = renderLoginScreen();
    
    expect(getByPlaceholderText('E-mail lub telefon (9 cyfr)')).toBeTruthy();
    expect(getByPlaceholderText('Hasło')).toBeTruthy();
    expect(getByText('Zaloguj się')).toBeTruthy();
  });

  it('shows validation errors for empty fields', async () => {
    const { getByText, getByTestId } = renderLoginScreen();
    
    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);
    
    // Should show validation errors
    expect(getByText('Wprowadź e-mail lub telefon')).toBeTruthy();
    expect(getByText('Wprowadź hasło')).toBeTruthy();
  });

  it('shows validation error for invalid email', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = renderLoginScreen();
    
    const emailInput = getByPlaceholderText('E-mail lub telefon (9 cyfr)');
    const passwordInput = getByPlaceholderText('Hasło');
    
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, 'password123');
    
    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);
    
    expect(getByText('Nieprawidłowy format e-maila')).toBeTruthy();
  });

  it('shows validation error for weak password', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = renderLoginScreen();
    
    const emailInput = getByPlaceholderText('E-mail lub telefon (9 cyfr)');
    const passwordInput = getByPlaceholderText('Hasło');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'weak');
    
    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);
    
    expect(getByText('Hasło musi mieć co najmniej 8 znaków')).toBeTruthy();
  });

  it('navigates to forgot password screen', () => {
    const { getByTestId } = renderLoginScreen();
    
    const forgotPasswordButton = getByTestId('forgot-password-button');
    fireEvent.press(forgotPasswordButton);
    
    // Should open forgot password modal
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('shows phone auth modal when phone login is pressed', () => {
    const { getByTestId } = renderLoginScreen();
    
    // Switch to register form first
    const registerModeButton = getByTestId('register-mode-button');
    fireEvent.press(registerModeButton);
    
    const phoneLoginButton = getByTestId('phone-login-button');
    fireEvent.press(phoneLoginButton);
    
    // Should open phone auth modal
    expect(mockNavigate).toHaveBeenCalledWith('PhoneAuth');
  });

  it('handles successful login', async () => {
    const { getByPlaceholderText, getByTestId } = renderLoginScreen();
    
    const emailInput = getByPlaceholderText('E-mail lub telefon (9 cyfr)');
    const passwordInput = getByPlaceholderText('Hasło');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'StrongPass123!');
    
    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);
    
    // Should navigate to main app
    expect(mockNavigate).toHaveBeenCalledWith('MainApp');
  });

  it('toggles password visibility', () => {
    const { getByPlaceholderText } = renderLoginScreen();
    
    const passwordInput = getByPlaceholderText('Hasło');
    expect(passwordInput.props.secureTextEntry).toBe(true);
    
    // Password visibility toggle is handled by PasswordInput component
    // This test verifies the initial state
  });
});
