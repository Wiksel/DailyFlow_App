import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PasswordInput from '../PasswordInput';

describe('PasswordInput Accessibility', () => {
  it('renders correctly with default props', () => {
    const { getByTestId } = render(
      <PasswordInput
        testID="password-input"
        value=""
        onChangeText={() => {}}
      />
    );
    const input = getByTestId('password-input');
    expect(input).toBeTruthy();
  });

  it('toggle button has accessibility props', () => {
    const { getByRole } = render(
      <PasswordInput
        value=""
        onChangeText={() => {}}
      />
    );

    // We expect a button role for the eye icon
    const toggleButton = getByRole('button');
    expect(toggleButton).toBeTruthy();

    // Initial state (hidden password) -> Button should say "Pokaż hasło" (Show password)
    expect(toggleButton.props.accessibilityLabel).toBe('Pokaż hasło');
  });

  it('toggles accessibility label when clicked', () => {
    const { getByRole } = render(
      <PasswordInput
        value=""
        onChangeText={() => {}}
      />
    );

    const toggleButton = getByRole('button');

    // Click to show password
    fireEvent.press(toggleButton);
    expect(toggleButton.props.accessibilityLabel).toBe('Ukryj hasło');

    // Click to hide password
    fireEvent.press(toggleButton);
    expect(toggleButton.props.accessibilityLabel).toBe('Pokaż hasło');
  });
});
