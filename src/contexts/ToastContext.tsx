import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../styles/AppStyles';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  message: string;
  type: ToastType;
}

interface ToastContextData {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextData | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const showToast = (message: string, type: ToastType) => {
    // Jeśli toast jest już wyświetlany, po prostu zaktualizuj wiadomość
    if (toast) {
      setToast({ message, type });
      return;
    }
    
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  };

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { backgroundColor: Colors.success, iconName: 'check-circle' as const };
      case 'error':
        return { backgroundColor: Colors.error, iconName: 'alert-triangle' as const };
      case 'info':
        return { backgroundColor: Colors.info, iconName: 'info' as const };
      default:
        return { backgroundColor: Colors.textSecondary, iconName: 'help-circle' as const };
    }
  };

  const toastStyle = toast ? getToastStyle(toast.type) : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && toastStyle && (
        <Animated.View style={[styles.toastContainer, { opacity: fadeAnim, backgroundColor: toastStyle.backgroundColor }]}>
          <Feather name={toastStyle.iconName} size={24} color="white" style={styles.icon} />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Spacing.xxLarge,
    left: Spacing.medium,
    right: Spacing.medium,
    padding: Spacing.medium,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  icon: {
    marginRight: Spacing.medium,
  },
  toastText: {
    ...Typography.body,
    color: 'white',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'left',
    lineHeight: Typography.body.fontSize * 1.4,
  },
});
