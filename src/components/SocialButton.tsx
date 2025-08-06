import React from 'react';
import { TouchableOpacity, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../styles/AppStyles';

interface SocialButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: 'google' | 'phone' | 'facebook' | 'apple';
  customIcon?: React.ReactNode;
  style?: any;
}

const SocialButton: React.FC<SocialButtonProps> = ({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  icon,
  customIcon,
  style,
}) => {
  const buttonDisabled = isLoading || disabled;

  const renderIcon = () => {
    if (customIcon) {
      return customIcon;
    }

    switch (icon) {
      case 'google':
        return <Image source={require('../../assets/google-icon.png')} style={styles.icon} />;
      case 'phone':
        return <Feather name="phone" size={18} color={Colors.textPrimary} style={styles.icon} />;
      case 'facebook':
        return <Feather name="facebook" size={18} color={Colors.textPrimary} style={styles.icon} />;
      case 'apple':
        return <Feather name="smartphone" size={18} color={Colors.textPrimary} style={styles.icon} />;
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonDisabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={buttonDisabled}
    >
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <>
          {renderIcon()}
          <Text style={styles.buttonText}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.medium,
  },
  disabledButton: {
    opacity: 0.6,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: Spacing.small,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontWeight: Typography.semiBold.fontWeight,
    fontSize: 15,
  },
});

export default SocialButton;