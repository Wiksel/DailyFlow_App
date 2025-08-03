import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { GlobalStyles } from '../styles/AppStyles';

interface ActionButtonProps {
    title: string;
    onPress: () => void;
    isLoading?: boolean;
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle | TextStyle[];
    disabled?: boolean;
}

const ActionButton = ({ title, onPress, isLoading = false, style, textStyle, disabled = false }: ActionButtonProps) => {
    const buttonDisabled = isLoading || disabled;

    return (
        <TouchableOpacity
            style={[GlobalStyles.button, style, buttonDisabled && GlobalStyles.disabledButton]}
            onPress={onPress}
            disabled={buttonDisabled}
        >
            {isLoading ? (
                <ActivityIndicator color="white" />
            ) : (
                <Text style={[GlobalStyles.buttonText, textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

// Lokalny StyleSheet nie jest już potrzebny, ponieważ wszystkie style pochodzą z GlobalStyles

export default ActionButton;