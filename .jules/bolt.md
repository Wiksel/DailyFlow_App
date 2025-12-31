## 2024-05-23 - [React Native List Optimization]
**Learning:** Passing inline arrow functions (e.g., `onPress={() => onPress(item)}`) to list items defeats `React.memo` because the function reference changes on every parent render.
**Action:** Pass the handler directly (e.g., `onPress={onPress}`) and let the child component handle the arguments, or use a stable callback pattern. In this case, we refactored the child to accept a generic handler and manage the invocation with its own `task` data.
