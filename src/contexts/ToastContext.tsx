import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../styles/AppStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  message: string;
  type: ToastType;
}

interface ToastContextData {
  showToast: (message: string, type: ToastType) => void;
  _toastState: { toast: ToastMessage | null; fadeAnim: Animated.Value };
  suppressGlobalOverlay: () => void;
  releaseGlobalOverlay: () => void;
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
  const [overlaySuppressCount, setOverlaySuppressCount] = useState(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastType) => {
    // Ustaw treść
    setToast({ message, type });

    // Zatrzymaj i zresetuj animację oraz timer ukrywania
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Upewnij się, że toast jest widoczny (fade in)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Ustaw nowy czas wygaśnięcia od zera
    hideTimeoutRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToast(null));
    }, 2500);
  };

  // Sprzątanie timera przy odmontowaniu providera
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

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

  const suppressGlobalOverlay = () => setOverlaySuppressCount((c) => c + 1);
  const releaseGlobalOverlay = () => setOverlaySuppressCount((c) => Math.max(0, c - 1));

  return (
    <ToastContext.Provider value={{ showToast, _toastState: { toast, fadeAnim }, suppressGlobalOverlay, releaseGlobalOverlay }}>
      {children}
      {overlaySuppressCount === 0 && <ToastOverlay />}
    </ToastContext.Provider>
  );
};

export const ToastOverlay = ({ topOffset }: { topOffset?: number }) => {
  const context = useContext(ToastContext);
  if (!context) return null;
  const { _toastState } = context;
  const { toast, fadeAnim } = _toastState;
  const insets = useSafeAreaInsets();

  if (!toast) return null;

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

  const toastStyle = getToastStyle(toast.type);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toastContainer,
          { opacity: fadeAnim, backgroundColor: toastStyle.backgroundColor, top: insets.top + (topOffset ?? Spacing.medium) },
        ]}
      >
        <Feather name={toastStyle.iconName} size={24} color="white" style={styles.icon} />
        <Text style={styles.toastText}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
};

// Komponent do lokalnego wyłączenia globalnego overlay (np. wewnątrz modalów)
export const ToastOverlaySuppressor = () => {
  const context = useContext(ToastContext);
  if (!context) return null;
  const { suppressGlobalOverlay, releaseGlobalOverlay } = context;
  useEffect(() => {
    suppressGlobalOverlay();
    return () => releaseGlobalOverlay();
  }, []);
  return null;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
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
    lineHeight: Typography.body.fontSize * 1.4,
  },
});
