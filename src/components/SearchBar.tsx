// src/components/SearchBar.tsx
import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    style?: ViewStyle;
    inputStyle?: TextStyle;
}

const SearchBar = ({ value, onChangeText, placeholder, style, inputStyle }: SearchBarProps) => {
  const theme = useTheme();
  const showClear = !!value?.length;
  return (
    <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, style]}>
      <Feather name="search" size={20} color={theme.colors.placeholder} style={styles.searchIcon} />
      <TextInput
        style={[GlobalStyles.input, styles.searchInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.textPrimary, borderColor: theme.colors.border }, inputStyle]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={theme.colors.placeholder}
        accessibilityLabel={placeholder}
        clearButtonMode="while-editing"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {showClear && (
        <TouchableOpacity onPress={() => onChangeText('')} accessibilityLabel="Wyczyść wyszukiwanie" style={styles.clearBtn}>
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