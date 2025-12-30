import React, { ReactNode } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';

interface ActionButtonConfig {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ActionModalProps {
  visible: boolean;
  title: string;
  message?: string;
  actions?: ActionButtonConfig[];
  onRequestClose?: () => void;
  children?: ReactNode;
  placement?: 'center' | 'bottom';
}

const ActionModal = ({ visible, title, message, actions = [], onRequestClose, children, placement = 'center' }: ActionModalProps) => {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onRequestClose}>
      <Animated.View style={styles.backdrop} entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)}>
        <Animated.View
          layout={Layout.springify()}
          style={[
            styles.card,
            placement === 'bottom' && styles.cardBottom,
            { backgroundColor: theme.colors.card },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text> : null}
          {children}
          <View style={[styles.actionsContainer, placement === 'bottom' && { justifyContent: 'flex-end' }]}>
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={`${action.text}-${idx}`}
                style={[
                  GlobalStyles.button,
                  styles.actionButton,
                  action.variant === 'secondary' && { backgroundColor: Colors.secondary },
                  action.variant === 'danger' && { backgroundColor: Colors.danger },
                  (!action.variant || action.variant === 'primary') && { backgroundColor: theme.colors.primary },
                ]}
                onPress={action.onPress}
              >
                <Text style={GlobalStyles.buttonText} numberOfLines={1} ellipsizeMode="tail">{action.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.large,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: Spacing.large,
    elevation: 6,
  },
  cardBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  title: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.small,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.large,
    lineHeight: Typography.body.fontSize * 1.4,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.small,
  },
  actionButton: {
    minWidth: 140,
    flexGrow: 1,
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
  },
  dangerButton: {
    backgroundColor: Colors.danger,
  },
});

export default ActionModal;


