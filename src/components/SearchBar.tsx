// src/components/SearchBar.tsx
import React, { useMemo, useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useDebounce } from '../hooks/useDebounce';
import { useTheme } from '../contexts/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch?: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  debounceMs?: number;
  initialValue?: string;
  testID?: string;
  onPressSaveIcon?: () => void;
  saveIconName?: string;
  showBottomBorder?: boolean;
  onSubmitEditing?: () => void;
}

const SearchBar = ({
  value,
  onChangeText,
  onSearch,
  placeholder,
  style,
  inputStyle,
  debounceMs = 300,
  initialValue = '',
  testID,
  onPressSaveIcon,
  saveIconName = 'save',
  showBottomBorder = true,
  onSubmitEditing,
}: SearchBarProps) => {
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState(initialValue);
  const showClear = !!(value || searchValue)?.length;
  const hasText = !!(value !== undefined ? value : searchValue)?.trim()?.length;
  const debouncedValue = useDebounce(searchValue, debounceMs);
  const effectivePlaceholder = useMemo(() => placeholder, [placeholder]);

  // Sync internal state with value prop
  useEffect(() => {
    if (value !== undefined) {
      setSearchValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (onSearch && debouncedValue !== initialValue) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch, initialValue]);

  const handleChangeText = (text: string) => {
    setSearchValue(text);
    onChangeText(text);
  };

  const handleClear = () => {
    setSearchValue('');
    onChangeText('');
    if (onSearch) onSearch('');
  };

  return (
    <View
      testID={testID ? `${testID}-container` : 'search-container'}
      style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderBottomWidth: showBottomBorder ? 1 : 0 }, style]}
    >
      <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
        <Feather name="search" size={18} color={theme.colors.placeholder} style={styles.leftIcon} />
        <TextInput
          testID={testID ? `${testID}-input` : 'search-input'}
          style={[styles.searchInput, { color: theme.colors.textPrimary }, inputStyle]}
          placeholder={effectivePlaceholder}
          value={value !== undefined ? value : searchValue}
          onChangeText={handleChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholderTextColor={theme.colors.placeholder}
          accessibilityLabel={effectivePlaceholder}
          clearButtonMode="while-editing"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {showClear && (
          <TouchableOpacity
            testID={testID ? `${testID}-clear` : 'search-clear'}
            onPress={handleClear}
            accessibilityLabel="Wyczyść wyszukiwanie"
            style={styles.iconBtn}
          >
            <Feather name="x-circle" size={18} color={theme.colors.placeholder} />
          </TouchableOpacity>
        )}
        {onPressSaveIcon && (
          <TouchableOpacity
            testID={testID ? `${testID}-save` : 'search-save'}
            onPress={onPressSaveIcon}
            disabled={!hasText}
            accessibilityLabel="Zapisz preset wyszukiwania"
            style={[styles.iconBtn, !hasText && { opacity: 0.4 }]}
          >
            <Feather name={saveIconName as any} size={18} color={theme.colors.placeholder} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 0,
    paddingVertical: Spacing.xSmall,
    borderBottomWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 14,
  },
  leftIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    minHeight: 40,
  },
  iconBtn: {
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});

export default SearchBar;