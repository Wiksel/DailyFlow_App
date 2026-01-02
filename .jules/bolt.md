## 2024-05-23 - [React Native List Optimization]
**Learning:** Passing inline arrow functions (e.g., `onPress={() => onPress(item)}`) to list items defeats `React.memo` because the function reference changes on every parent render.
**Action:** Pass the handler directly (e.g., `onPress={onPress}`) and let the child component handle the arguments, or use a stable callback pattern. In this case, we refactored the child to accept a generic handler and manage the invocation with its own `task` data.

## 2026-01-02 - [SectionList Collapsed State Optimization]
**Learning:** Rendering items that return `null` in a `SectionList` (or `FlatList`) still incurs overhead because the virtualization logic must process them.
**Action:** When a section is collapsed, pass an empty array `[]` as the `data` for that section. This allows the list to completely skip those items. To keep section headers correct (e.g., showing counts), store the original data or count in a separate property (e.g., `section.originalData`) and use that in `renderSectionHeader`. Also, separate the expensive data processing (bucketing/sorting) from the cheap view structure generation (creating sections array) using separate `useMemo` hooks so that toggling collapse state doesn't trigger heavy recalculations.
