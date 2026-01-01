import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import Animated, { Layout, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { Colors, Spacing } from '../styles/AppStyles';
import TaskListItem from './TaskListItem';
import { Task, Category } from '../types';

type Props = {
  task: Task;
  category: Category | undefined;
  index: number;
  isCompact: boolean;
  selectionMode: boolean;
  selected: boolean;
  isPinned: boolean;
  highlightQuery?: string;
  onPress: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onConfirmAction: (task: Task) => void;
  onToggleSelect: (task: Task) => void;
  onOpenMenu?: (task: Task) => void;
  onTogglePinned?: (task: Task) => void;
};

const SwipeableTaskItem = React.memo(({
  task,
  category,
  index,
  isCompact,
  selectionMode,
  selected,
  isPinned,
  highlightQuery,
  onPress,
  onToggleComplete,
  onConfirmAction,
  onToggleSelect,
  onOpenMenu,
  onTogglePinned,
}: Props) => {
  const theme = useTheme();

  const renderLeft = useCallback(() => (
    <View style={[styles.swipeLeft, { backgroundColor: theme.colors.success }]}>
      <Feather name="check" size={22} color={'white'} />
      <Text style={styles.swipeText}>Ukończ</Text>
    </View>
  ), [theme.colors.success]);

  const renderRight = useCallback(() => (
    <View style={[styles.swipeRight, { backgroundColor: theme.colors.danger }]}>
      <Feather name="trash-2" size={22} color={'white'} />
      <Text style={styles.swipeText}>{task.completed ? 'Usuń' : 'Usuń'}</Text>
    </View>
  ), [theme.colors.danger, task.completed]);

  const handleSwipeableOpen = useCallback((direction: 'left' | 'right') => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { }
    if (direction === 'left') { onToggleComplete(task); }
    if (direction === 'right') { onConfirmAction(task); }
  }, [task, onToggleComplete, onConfirmAction]);

  return (
    <Swipeable
      renderLeftActions={renderLeft}
      renderRightActions={renderRight}
      onSwipeableOpen={handleSwipeableOpen}
      leftThreshold={64}
      rightThreshold={64}
      overshootLeft={false}
      overshootRight={false}
    >
      <Animated.View
        layout={Layout.springify()}
        entering={FadeInUp.delay(Math.min(300, index * 20))}
        style={[styles.itemContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, shadowColor: Colors.shadow }]}
      >
        <TaskListItem
          task={task}
          category={category}
          onPress={onPress}
          onLongPress={onToggleSelect}
          onToggleComplete={onToggleComplete}
          onConfirmAction={onConfirmAction}
          isCompact={isCompact}
          selectionMode={selectionMode}
          selected={selected}
          onToggleSelect={onToggleSelect}
          onOpenMenu={!selectionMode ? onOpenMenu : undefined}
          pinned={isPinned}
          onTogglePinned={onTogglePinned}
          highlightQuery={highlightQuery}
        />
      </Animated.View>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  itemContainer: {
    marginHorizontal: Spacing.medium,
    marginTop: Spacing.small,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderWidth: 1,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  swipeLeft: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    marginHorizontal: Spacing.medium,
    marginTop: Spacing.small,
    borderRadius: 12,
    height: '100%',
    flex: 1,
  },
  swipeRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    marginHorizontal: Spacing.medium,
    marginTop: Spacing.small,
    borderRadius: 12,
    height: '100%',
    flex: 1,
  },
  swipeText: {
    color: 'white',
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default SwipeableTaskItem;
