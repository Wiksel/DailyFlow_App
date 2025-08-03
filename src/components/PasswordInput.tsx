import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';

interface PasswordInputProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: TextStyle | TextStyle[];
}

const PasswordInput = ({ value, onChangeText, containerStyle, inputStyle, placeholder = "Hasło", ...props }: PasswordInputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!isPasswordVisible}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        {...props}
      />
      <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
        <Feather name={isPasswordVisible ? "eye-off" : "eye"} size={22} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...GlobalStyles.input,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: Spacing.medium,
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
  },
  eyeIcon: {
    paddingLeft: Spacing.small,
    paddingRight: Spacing.medium,
  },
});

export default PasswordInput;