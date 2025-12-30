import React, { RefObject, useRef } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import CountryPicker, { Country } from 'react-native-country-picker-modal';
import { Keyboard } from 'react-native';
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
  // Usuwamy agresywne wymuszanie – pole filtra samo prosi o focus
  const resolvedTextColor = textColor || theme.colors.textPrimary;
  const resolvedPlaceholder = placeholderTextColor || theme.colors.placeholder;
  const filterInputRef = useRef<TextInput | null>(null);
  const focusTimer1Ref = useRef<any>(null);
  const focusTimer2Ref = useRef<any>(null);
  const focusTimer3Ref = useRef<any>(null);

  const handlePickerClose = () => {
    try { Keyboard.dismiss(); } catch {}
  };

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
        // Autofocusuj pole wyszukiwarki po otwarciu modala
        filterProps={{ autoFocus: true, ref: filterInputRef as any }}
        
        onClose={handlePickerClose}
        modalProps={{
          presentationStyle: 'fullScreen',
          transparent: false,
          animationType: Platform.OS === 'android' ? 'none' : 'slide',
          statusBarTranslucent: false,
          onShow: () => {
            try { if (focusTimer1Ref.current) clearTimeout(focusTimer1Ref.current); } catch {}
            try { if (focusTimer2Ref.current) clearTimeout(focusTimer2Ref.current); } catch {}
            try { if (focusTimer3Ref.current) clearTimeout(focusTimer3Ref.current); } catch {}
            focusTimer1Ref.current = setTimeout(() => { try { filterInputRef.current?.focus(); } catch {} }, 260);
            focusTimer2Ref.current = setTimeout(() => { try { filterInputRef.current?.focus(); } catch {} }, 520);
            focusTimer3Ref.current = setTimeout(() => { try { filterInputRef.current?.focus(); } catch {} }, 820);
          },
        } as any}
        onOpen={() => {
          try { if (focusTimer1Ref.current) clearTimeout(focusTimer1Ref.current); } catch {}
          focusTimer1Ref.current = setTimeout(() => { try { filterInputRef.current?.focus(); } catch {} }, 120);
        }}
        theme={{
          backgroundColor: '#111',
          onBackgroundTextColor: '#fff',
          primaryColor: '#0782F9',
          fontSize: 16,
        }}
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


