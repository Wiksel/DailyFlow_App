import React, { ReactNode } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';

interface ActionButtonConfig {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ActionModalProps {
  visible: boolean;
  title: string;
  message?: string;
  actions: ActionButtonConfig[];
  onRequestClose?: () => void;
  children?: ReactNode;
}

const ActionModal = ({ visible, title, message, actions, onRequestClose, children }: ActionModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children}
          <View style={styles.actionsRow}>
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={`${action.text}-${idx}`}
                style={[
                  GlobalStyles.button,
                  styles.actionButton,
                  action.variant === 'secondary' && styles.secondaryButton,
                  action.variant === 'danger' && styles.dangerButton,
                ]}
                onPress={action.onPress}
              >
                <Text style={GlobalStyles.buttonText} numberOfLines={1} ellipsizeMode="tail">{action.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: Spacing.large,
    elevation: 6,
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.medium,
  },
  actionButton: {
    minWidth: 140,
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
  },
  dangerButton: {
    backgroundColor: Colors.danger,
  },
});

export default ActionModal;


