## 2024-05-23 - FlatList Optimization
**Learning:** Extracting inline `renderItem` functions to memoized components significantly improves `FlatList` performance, especially when combined with `useCallback` for handlers and `FlatList` optimization props.
**Action:** Always extract `renderItem` to a separate component and wrap in `React.memo` for lists with potential frequent updates or many items. Use `initialNumToRender`, `windowSize`, and `removeClippedSubviews` for long lists.
