import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import ActionButton from '../ActionButton';

describe('ActionButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByText } = render(
      <ActionButton title="Test Button" onPress={mockOnPress} />
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const { getByText } = render(
      <ActionButton title="Test Button" onPress={mockOnPress} />
    );
    
    await act(async () => {
      fireEvent.press(getByText('Test Button'));
    });
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders with different variants', () => {
    const { getByText, rerender } = render(
      <ActionButton title="Primary" onPress={mockOnPress} />
    );
    
    expect(getByText('Primary')).toBeTruthy();
    
    rerender(
      <ActionButton title="Secondary" onPress={mockOnPress} />
    );
    
    expect(getByText('Secondary')).toBeTruthy();
  });

  it('renders with icon when provided', () => {
    const { getByText } = render(
      <ActionButton 
        title="Icon Button" 
        onPress={mockOnPress}
        leftIcon="star"
      />
    );
    
    expect(getByText('Icon Button')).toBeTruthy();
  });

  it('applies disabled state correctly', () => {
    const { getByText } = render(
      <ActionButton title="Disabled Button" onPress={mockOnPress} disabled />
    );
    
    const button = getByText('Disabled Button');
    expect(button).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByText } = render(
      <ActionButton 
        title="Styled Button" 
        onPress={mockOnPress}
        style={customStyle}
      />
    );
    
    expect(getByText('Styled Button')).toBeTruthy();
  });

  it('renders with loading state', () => {
    const { getByLabelText, queryByText } = render(
      <ActionButton title="Loading Button" onPress={mockOnPress} isLoading />
    );
    
    // When loading, the text should not be visible, only ActivityIndicator
    expect(queryByText('Loading Button')).toBeNull();
    // The button should still be accessible with the loading label
    expect(getByLabelText('Loading Button')).toBeTruthy();
  });

  it('does not call onPress when loading', async () => {
    const { getByLabelText } = render(
      <ActionButton title="Loading Button" onPress={mockOnPress} isLoading />
    );
    
    await act(async () => {
      fireEvent.press(getByLabelText('Loading Button'));
    });
    
    expect(mockOnPress).not.toHaveBeenCalled();
  });
});
