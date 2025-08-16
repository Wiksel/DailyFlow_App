import React, { RefObject } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import CountryPicker, { Country } from 'react-native-country-picker-modal';
import { Colors, GlobalStyles, Spacing } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';

interface PhoneNumberFieldProps {
  country: Country;
  onSelectCountry: (country: Country) => void;
  inputRef: RefObject<TextInput | null>;
  value: string; // formatted local number e.g. "000 000 000"
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  placeholderTextColor?: string;
  textColor?: string;
}

const PhoneNumberField = ({
  country,
  onSelectCountry,
  inputRef,
  value,
  onChangeText,
  onSubmitEditing,
  placeholderTextColor = Colors.placeholder,
  textColor,
}: PhoneNumberFieldProps) => {
  const theme = useTheme();
  const resolvedTextColor = textColor || theme.colors.textPrimary;
  const resolvedPlaceholder = placeholderTextColor || theme.colors.placeholder;
  return (
    <View style={[styles.container, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}>
      <CountryPicker
        countryCode={country.cca2}
        withFilter
        withFlag
        withCallingCode
        withCallingCodeButton
        withCountryNameButton={false}
        onSelect={onSelectCountry}
        containerButtonStyle={styles.countryPickerButton}
        onOpen={() => setTimeout(() => inputRef.current?.focus(), 0)}
      />
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: resolvedTextColor }]}
        placeholder="000 000 000"
        keyboardType="phone-pad"
        autoFocus={false}
        value={value}
        onChangeText={onChangeText}
        maxLength={11}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit
        placeholderTextColor={resolvedPlaceholder}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: Spacing.medium,
    width: '100%',
  },
  countryPickerButton: {
    paddingVertical: Spacing.small,
    paddingHorizontal: Spacing.small,
    marginRight: Spacing.xSmall,
  },
  input: {
    ...GlobalStyles.input,
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: Spacing.small,
  },
});

export default PhoneNumberField;


