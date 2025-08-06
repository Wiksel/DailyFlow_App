import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ToastProvider } from '../contexts/ToastContext';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <ToastProvider>{children}</ToastProvider>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };