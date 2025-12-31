import React from 'react';
import { render } from '@testing-library/react-native';
import LabeledInput from '../LabeledInput';

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
