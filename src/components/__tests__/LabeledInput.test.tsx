import React from 'react';
import { render } from '@testing-library/react-native';
import LabeledInput from '../LabeledInput';

// Mock the useTheme hook
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    colors: {
      primary: '#0782F9',
      textPrimary: '#1a1a1a',
      textSecondary: '#5a5a5a',
      border: '#e0e0e0',
      inputBackground: '#F0F2F5',
      placeholder: '#6c757d',
    },
  }),
  lightColors: {
    primary: '#0782F9',
    textPrimary: '#1a1a1a',
    textSecondary: '#5a5a5a',
    border: '#e0e0e0',
    inputBackground: '#F0F2F5',
    placeholder: '#6c757d',
  },
  darkColors: {
    primary: '#4DA3FF',
    textPrimary: '#F5F5F5',
    textSecondary: '#B0BEC5',
    border: '#333333',
    inputBackground: '#2C2C2C',
    placeholder: '#78909C',
  },
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useDerivedValue: jest.fn((cb) => ({ value: cb() })),
    useAnimatedStyle: jest.fn(() => ({})),
    useAnimatedProps: jest.fn(() => ({})),
    withTiming: jest.fn((toValue) => toValue),
    interpolateColor: jest.fn(() => '#000000'),
  };
});

describe('LabeledInput Accessibility', () => {
  it('sets accessibilityLabel from label prop', () => {
    const { getByTestId } = render(
      <LabeledInput
        testID="labeled-input"
        label="Test Label"
        value=""
        onChangeText={() => {}}
      />
    );
    const input = getByTestId('labeled-input');
    expect(input.props.accessibilityLabel).toBe('Test Label');
  });

  it('sets accessibilityLabel from placeholder when label is missing', () => {
    const { getByTestId } = render(
      <LabeledInput
        testID="placeholder-input"
        placeholder="Test Placeholder"
        value=""
        onChangeText={() => {}}
      />
    );
    const input = getByTestId('placeholder-input');
    expect(input.props.accessibilityLabel).toBe('Test Placeholder');
  });
});
