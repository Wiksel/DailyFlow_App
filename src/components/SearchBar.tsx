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
  testID 
}: SearchBarProps) => {
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState(initialValue);
  const showClear = !!(value || searchValue)?.length;
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
      style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, style]}
    >
      <Feather name="search" size={20} color={theme.colors.placeholder} style={styles.searchIcon} />
      <TextInput
        testID={testID ? `${testID}-input` : 'search-input'}
        style={[GlobalStyles.input, styles.searchInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.textPrimary, borderColor: theme.colors.border }, inputStyle]}
        placeholder={effectivePlaceholder}
        value={value !== undefined ? value : searchValue}
        onChangeText={handleChangeText}
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
          style={styles.clearBtn}
        >
          <Feather name="x-circle" size={18} color={theme.colors.placeholder} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.medium,
        paddingVertical: Spacing.small,
        borderBottomWidth: 1,
    },
    searchIcon: {
        marginRight: Spacing.small,
    },
    searchInput: {
        flex: 1,
        minHeight: 40,
    },
    clearBtn: {
        marginLeft: Spacing.small,
        paddingHorizontal: Spacing.xSmall,
        paddingVertical: Spacing.xSmall,
    },
});

export default SearchBar;