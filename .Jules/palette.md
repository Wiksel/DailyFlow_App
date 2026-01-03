## 2024-05-24 - Component Testing with Mocked Contexts
**Learning:** Component tests using mocked contexts (like ThemeContext) often fail when the component uses animated values or hooks that depend on the context being fully initialized.
**Action:** Always provide a proper mocked context provider or ensure the mock returns all necessary values (including animated values or derived state) when testing components in isolation.
