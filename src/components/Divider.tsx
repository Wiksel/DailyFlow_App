import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../styles/AppStyles';

interface DividerProps {
  text?: string;
  style?: any;
}

const Divider: React.FC<DividerProps> = ({ text, style }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.line} />
      {text && <Text style={styles.text}>{text}</Text>}
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: Spacing.large,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  text: {
    marginHorizontal: Spacing.small,
    color: Colors.textSecondary,
    fontWeight: Typography.semiBold.fontWeight,
  },
});

export default Divider;