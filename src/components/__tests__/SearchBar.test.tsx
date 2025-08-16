import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SearchBar from '../SearchBar';

describe('SearchBar', () => {
  const mockOnChangeText = jest.fn();
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByPlaceholderText } = render(
      <SearchBar 
        value="" 
        onChangeText={mockOnChangeText}
        placeholder="Search..."
      />
    );

    expect(getByPlaceholderText('Search...')).toBeTruthy();
  });

  it('calls onChangeText when typing', () => {
    const { getByPlaceholderText } = render(
      <SearchBar 
        value="" 
        onChangeText={mockOnChangeText}
        placeholder="Search..."
      />
    );
    
    const input = getByPlaceholderText('Search...');
    fireEvent.changeText(input, 'test');
    
    expect(mockOnChangeText).toHaveBeenCalledWith('test');
  });

  it('debounces search calls', async () => {
    const { getByPlaceholderText } = render(
      <SearchBar 
        value="" 
        onChangeText={mockOnChangeText}
        onSearch={mockOnSearch}
        placeholder="Search..."
        debounceMs={100}
      />
    );
    
    const input = getByPlaceholderText('Search...');
    
    // Type multiple characters quickly
    fireEvent.changeText(input, 't');
    fireEvent.changeText(input, 'te');
    fireEvent.changeText(input, 'tes');
    fireEvent.changeText(input, 'test');
    
    // Should not call onSearch immediately
    expect(mockOnSearch).not.toHaveBeenCalled();
    
    // Wait for debounce
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test');
    }, { timeout: 200 });
  });

  it('clears search when clear button is pressed', () => {
    const { getByTestId } = render(
      <SearchBar 
        value="test" 
        onChangeText={mockOnChangeText}
        onSearch={mockOnSearch}
        placeholder="Search..."
      />
    );
    
    const clearButton = getByTestId('search-clear');
    fireEvent.press(clearButton);
    
    expect(mockOnChangeText).toHaveBeenCalledWith('');
    expect(mockOnSearch).toHaveBeenCalledWith('');
  });

  it('shows clear button only when there is text', () => {
    const { queryByTestId, rerender } = render(
      <SearchBar 
        value="" 
        onChangeText={mockOnChangeText}
        placeholder="Search..."
      />
    );
    
    // Should not show clear button when empty
    expect(queryByTestId('search-clear')).toBeNull();
    
    // Should show clear button when there's text
    rerender(
      <SearchBar 
        value="test" 
        onChangeText={mockOnChangeText}
        placeholder="Search..."
      />
    );
    
    expect(queryByTestId('search-clear')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByPlaceholderText } = render(
      <SearchBar 
        value="" 
        onChangeText={mockOnChangeText}
        placeholder="Search..."
        style={customStyle}
      />
    );
    
    expect(getByPlaceholderText('Search...')).toBeTruthy();
  });

  it('renders with initial value', () => {
    const { getByDisplayValue } = render(
      <SearchBar 
        value="initial" 
        onChangeText={mockOnChangeText}
        placeholder="Search..."
        initialValue="initial"
      />
    );
    
    expect(getByDisplayValue('initial')).toBeTruthy();
  });
});
