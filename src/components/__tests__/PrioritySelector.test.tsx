import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PrioritySelector from '../PrioritySelector';

// Mock the ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      success: 'green',
      warning: 'orange',
      danger: 'red',
      border: 'gray',
    },
  }),
}));

describe('PrioritySelector Accessibility', () => {
  it('renders with correct accessibility roles and states', () => {
    const onSelectMock = jest.fn();
    const { getAllByRole } = render(
      <PrioritySelector value={3} onSelect={onSelectMock} />
    );

    const radioButtons = getAllByRole('radio');
    expect(radioButtons).toHaveLength(5);

    // Check individual buttons
    expect(radioButtons[0].props.accessibilityLabel).toBe('Priorytet 1 - Najniższy');
    expect(radioButtons[0].props.accessibilityState).toEqual({ checked: false });

    expect(radioButtons[2].props.accessibilityLabel).toBe('Priorytet 3 - Średni');
    expect(radioButtons[2].props.accessibilityState).toEqual({ checked: true });

    expect(radioButtons[4].props.accessibilityLabel).toBe('Priorytet 5 - Krytyczny');
    expect(radioButtons[4].props.accessibilityState).toEqual({ checked: false });
  });

  it('handles selection via accessibility actions or press', () => {
    const onSelectMock = jest.fn();
    const { getAllByRole } = render(
      <PrioritySelector value={3} onSelect={onSelectMock} />
    );

    const radioButtons = getAllByRole('radio');
    fireEvent.press(radioButtons[0]);
    expect(onSelectMock).toHaveBeenCalledWith(1);
  });
});
