import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useToast } from '../contexts/ToastContext';
import { AUTH_ERRORS, ERROR_MESSAGES } from '../constants/errors';

interface ErrorHandlerOptions {
  showAlert?: boolean;
  showToast?: boolean;
  defaultMessage?: string;
}

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const { showToast } = useToast();
  const {
    showAlert = false,
    showToast: shouldShowToast = true,
    defaultMessage = ERROR_MESSAGES.DEFAULT,
  } = options;

  const handleError = useCallback(
    (error: any, customMessage?: string) => {
      const message = customMessage || error?.message || defaultMessage;
      
      console.error('Error handled:', error);
      
      if (shouldShowToast) {
        showToast(message, 'error');
      }
      
      if (showAlert) {
        Alert.alert('Błąd', message);
      }
    },
    [showToast, shouldShowToast, showAlert, defaultMessage],
  );

  const handleAuthError = useCallback(
    (error: any) => {
      const code = error?.code || '';
      const message = ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.DEFAULT;

      handleError(error, message);
    },
    [handleError],
  );

  return {
    handleError,
    handleAuthError,
  };
};