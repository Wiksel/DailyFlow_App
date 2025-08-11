import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Typography } from '../styles/AppStyles';
import { Feather } from '@expo/vector-icons';

interface BottomQuickAddProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  onSubmit: () => void;
  disabled?: boolean;
}

const BottomQuickAdd: React.FC<BottomQuickAddProps> = ({ value, onChangeText, placeholder, onSubmit, disabled }) => {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      accessibilityRole="toolbar"
    >
      <TextInput
        style={[styles.input, { color: theme.colors.textPrimary }]} 
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
        testID="quick-add-input"
      />
      <Animated.View style={animatedStyle}>
        <TouchableOpacity testID="quick-add-button" onPressIn={() => { if (!disabled) scale.value = withSpring(0.96, { damping: 18 }); }} onPressOut={() => { scale.value = withSpring(1, { damping: 18 }); }} onPress={onSubmit} disabled={disabled} style={[styles.addButton, { backgroundColor: disabled ? theme.colors.placeholder : theme.colors.primary }]} accessibilityLabel="Dodaj">
          <Feather name="plus" size={22} color={'#fff'} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: Spacing.medium,
    backgroundColor: 'transparent',
    fontSize: Typography.body.fontSize,
  },
  addButton: {
    marginLeft: Spacing.small,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default BottomQuickAdd;


