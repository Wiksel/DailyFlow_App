## 2024-05-23 - Accessibility in React Native
**Learning:** React Native's accessibility props are powerful but often overlooked. specifically `accessibilityRole`, `accessibilityLabel`, and `accessibilityState`.
**Action:** Always verify that interactive elements like `TouchableOpacity` have at least an `accessibilityRole` and `accessibilityLabel` if they contain only icons or abstract shapes. Use `accessibilityViewIsModal` for Modals on iOS.
