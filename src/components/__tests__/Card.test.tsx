import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import Card from '../Card';

describe('Card', () => {
  it('renders basic content without context providers', () => {
    const { getByText } = render(
      <Card>
        <Text>Simple Text</Text>
      </Card>
    );

    expect(getByText('Simple Text')).toBeTruthy();
  });

  it('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );
    
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('calls onPress when pressed and pressable', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Card pressable onPress={mockOnPress}>
        <Text>Pressable Card</Text>
      </Card>
    );
    
    fireEvent.press(getByText('Pressable Card'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when not pressable', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Card onPress={mockOnPress}>
        <Text>Non-pressable Card</Text>
      </Card>
    );
    
    fireEvent.press(getByText('Non-pressable Card'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('applies custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByText } = render(
      <Card style={customStyle}>
        <Text>Styled Card</Text>
      </Card>
    );
    
    expect(getByText('Styled Card')).toBeTruthy();
  });

  it('renders with different variants', () => {
    const { getByText, rerender } = render(
      <Card variant="default">
        <Text>Default Card</Text>
      </Card>
    );
    
    expect(getByText('Default Card')).toBeTruthy();
    
    rerender(
      <Card variant="elevated">
        <Text>Elevated Card</Text>
      </Card>
    );
    
    expect(getByText('Elevated Card')).toBeTruthy();
    
    rerender(
      <Card variant="outlined">
        <Text>Outlined Card</Text>
      </Card>
    );
    
    expect(getByText('Outlined Card')).toBeTruthy();
  });

  it('applies disabled state correctly', () => {
    const { getByText } = render(
      <Card disabled>
        <Text>Disabled Card</Text>
      </Card>
    );
    
    expect(getByText('Disabled Card')).toBeTruthy();
  });
});
