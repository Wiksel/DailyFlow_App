// src/components/SearchBar.tsx
import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles'; // Import globalnych stylów

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    style?: ViewStyle;
    inputStyle?: TextStyle;
}

const SearchBar = ({ value, onChangeText, placeholder, style, inputStyle }: SearchBarProps) => {
    return (
        <View style={[styles.searchContainer, style]}>
            <Feather name="search" size={20} color={Colors.placeholder} style={styles.searchIcon} />
            <TextInput
                style={[GlobalStyles.input, styles.searchInput, inputStyle]} // Rozszerz o GlobalStyles.input
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor={Colors.placeholder}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: Spacing.medium,
        paddingVertical: Spacing.small, // Dostosuj padding, aby pasował do GlobalStyles.input
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    searchIcon: {
        marginRight: Spacing.small,
    },
    searchInput: {
        flex: 1,
        // Usunięto redundantne style, które są już w GlobalStyles.input
        // height: 40,
        // backgroundColor: Colors.inputBackground,
        // borderRadius: 8,
        // paddingHorizontal: Spacing.small,
        // fontSize: Typography.body.fontSize,
    },
});

export default SearchBar;