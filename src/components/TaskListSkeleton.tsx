import React from 'react';
import { View } from 'react-native';
import { Spacing } from '../styles/AppStyles';

const Row = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.medium, marginTop: Spacing.small }}>
    <View style={{ width: 3, height: 68, borderRadius: 2, backgroundColor: '#e9ecef', marginRight: 8 }} />
    <View style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#eceff1', backgroundColor: '#f8f9fa', height: 68 }} />
  </View>
);

export default function TaskListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <Row key={i} />
      ))}
      <View style={{ height: Spacing.xLarge * 2 }} />
    </View>
  );
}



