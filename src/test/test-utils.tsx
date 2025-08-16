import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock theme context values
const mockTheme = {
  mode: 'light' as const,
  colorScheme: 'light' as const,
  accent: 'blue' as const,
  colors: {
    primary: '#007AFF',
    purple: '#7e57c2',
    secondary: '#5bc0de',
    success: '#28a745',
    danger: '#e74c3c',
    warning: '#f1c40f',
    info: '#17a2b8',
    background: '#FFFFFF',
    card: '#F2F2F7',
    text: '#000000',
    textPrimary: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    placeholder: '#8E8E93',
    inputBackground: '#FFFFFF',
    shadow: '#000000',
  },
  setMode: jest.fn(),
  setAccent: jest.fn(),
};

// Mock UI context values
const mockUI = {
  showThemeFade: false,
  setShowThemeFade: jest.fn(),
};

// Mock toast context values
const mockToast = {
  showToast: jest.fn(),
  hideToast: jest.fn(),
};

// Mock category context values
const mockCategories = {
  categories: [],
  addCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  getCategoryById: jest.fn(),
};

// Simple wrapper with just SafeAreaProvider
export const SimpleWrapper = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider>
    {children}
  </SafeAreaProvider>
);

// Custom render function that includes just SafeAreaProvider
export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  return render(ui, { wrapper: SimpleWrapper, ...options });
};

// Export mock values for use in tests
export { mockTheme, mockUI, mockToast, mockCategories };
