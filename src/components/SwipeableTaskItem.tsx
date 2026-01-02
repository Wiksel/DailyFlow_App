import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import Animated, { Layout, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { Colors, Spacing } from '../styles/AppStyles';
import ModernTaskItem from './ModernTaskItem';
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
  const swipeableRef = React.useRef<Swipeable>(null);

  const renderRight = useCallback(() => (
    <View style={styles.swipeRight}>
      <View style={[styles.swipeAction, { backgroundColor: task.completed ? Colors.warning : Colors.danger, justifyContent: 'flex-end', paddingRight: 24 }]}>
        <Text style={[styles.swipeText, { marginRight: 8 }]}>{task.completed ? 'Archiwum' : 'Usuń'}</Text>
        <Feather name={task.completed ? "archive" : "trash-2"} size={22} color={'white'} />
      </View>
    </View>
  ), [task.completed]);

  const renderLeft = useCallback(() => (
    <View style={styles.swipeLeft}>
      {/* Undo uses Purple #8A4FFF, Complete uses Success Green */}
      <View style={[styles.swipeAction, { backgroundColor: task.completed ? '#8A4FFF' : theme.colors.success, justifyContent: 'flex-start', paddingLeft: 24 }]}>
        <Feather name={task.completed ? "rotate-ccw" : "check"} size={22} color={'white'} />
        <Text style={[styles.swipeText, { marginLeft: 8 }]}>{task.completed ? 'Cofnij' : 'Ukończ'}</Text>
      </View>
    </View>
  ), [theme.colors.success, task.completed]);

  const handleSwipeableOpen = useCallback((direction: 'left' | 'right') => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { }

    // Close swipeable immediately to prevent it from getting stuck
    swipeableRef.current?.close();

    // Use requestAnimationFrame or setTimeout to allow close animation to start before action
    requestAnimationFrame(() => {
      if (direction === 'left') { onToggleComplete(task); }
      if (direction === 'right') { onConfirmAction(task); }
    });
  }, [task, onToggleComplete, onConfirmAction]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeft}
      renderRightActions={renderRight}
      onSwipeableOpen={handleSwipeableOpen}
      leftThreshold={60}
      rightThreshold={60}
      overshootLeft={false}
      overshootRight={false}
      containerStyle={{ overflow: 'visible' }}
    >
      <Animated.View
        layout={Layout.springify()}
        entering={FadeInUp.delay(Math.min(300, index * 20))}
        style={styles.itemContainer}
      >
        <ModernTaskItem
          task={task}
          category={category}
          onPress={onPress}
          onLongPress={onToggleSelect}
          onToggleComplete={onToggleComplete}
          isCompact={isCompact}
          selectionMode={selectionMode}
          selected={selected}
          onToggleSelect={onToggleSelect}
          pinned={isPinned}
          highlightQuery={highlightQuery}
        />
      </Animated.View>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  itemContainer: {},
  swipeLeft: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  swipeRight: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  swipeAction: {
    flex: 1,
    width: '100%',
    justifyContent: 'center', // Updated in inline styles for specific sides
    paddingHorizontal: 0, // Handled by paddingLeft/Right
    marginTop: 0,
    marginBottom: Spacing.small,
    marginHorizontal: Spacing.medium,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeText: {
    color: 'white',
    fontWeight: '700',
  },
});

export default SwipeableTaskItem;
