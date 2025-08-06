import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';

interface FormFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  touched?: boolean;
  containerStyle?: any;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  touched,
  containerStyle,
  style,
  ...props
}) => {
  const showError = error && touched;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          GlobalStyles.input,
          showError && styles.inputError,
          style,
        ]}
        placeholderTextColor={Colors.placeholder}
        {...props}
      />
      {showError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.small,
  },
  label: {
    ...Typography.body,
    fontWeight: Typography.semiBold.fontWeight,
    color: Colors.textPrimary,
    marginBottom: Spacing.xSmall,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.small.fontSize,
    marginTop: Spacing.xSmall,
    marginLeft: Spacing.small,
  },
});

export default FormField;