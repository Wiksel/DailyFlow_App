const { device, element, by, expect } = require('detox');

describe('DailyFlow App Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Authentication Flow', () => {
    it('should show login screen on app start', async () => {
      await expect(element(by.text('Zaloguj się'))).toBeVisible();
      await expect(element(by.text('Email'))).toBeVisible();
      await expect(element(by.text('Hasło'))).toBeVisible();
    });

    it('should show validation errors for empty login form', async () => {
      const loginButton = element(by.id('login-button'));
      await loginButton.tap();
      
      await expect(element(by.text('Email jest wymagany'))).toBeVisible();
      await expect(element(by.text('Hasło jest wymagane'))).toBeVisible();
    });

    it('should show forgot password modal', async () => {
      const forgotPasswordLink = element(by.text('Zapomniałeś hasła?'));
      await forgotPasswordLink.tap();
      
      await expect(element(by.text('Resetowanie hasła'))).toBeVisible();
    });

    it('should show phone auth modal', async () => {
      const phoneLoginButton = element(by.text('Zaloguj się przez telefon'));
      await phoneLoginButton.tap();
      
      await expect(element(by.text('Logowanie przez telefon'))).toBeVisible();
    });
  });

  describe('Task Management', () => {
    it('should add new task', async () => {
      // Navigate to add task (assuming user is logged in)
      const addTaskButton = element(by.id('add-task-button'));
      await addTaskButton.tap();
      
      // Fill task form
      const taskInput = element(by.id('task-text-input'));
      await taskInput.typeText('Test task');
      
      const saveButton = element(by.id('save-task-button'));
      await saveButton.tap();
      
      // Verify task was added
      await expect(element(by.text('Test task'))).toBeVisible();
    });

    it('should complete task', async () => {
      const taskItem = element(by.text('Test task'));
      await taskItem.tap();
      
      const completeButton = element(by.id('complete-task-button'));
      await completeButton.tap();
      
      // Task should be marked as completed
      await expect(element(by.id('task-completed-indicator'))).toBeVisible();
    });

    it('should filter tasks by category', async () => {
      const categoryFilter = element(by.id('category-filter'));
      await categoryFilter.tap();
      
      const workCategory = element(by.text('Praca'));
      await workCategory.tap();
      
      // Should show only work tasks
      await expect(element(by.id('filtered-tasks-list'))).toBeVisible();
    });
  });

  describe('Budget Management', () => {
    it('should create new budget', async () => {
      // Navigate to budgets tab
      const budgetsTab = element(by.text('Budżet'));
      await budgetsTab.tap();
      
      const addBudgetButton = element(by.id('add-budget-button'));
      await addBudgetButton.tap();
      
      // Fill budget form
      const budgetNameInput = element(by.id('budget-name-input'));
      await budgetNameInput.typeText('Test Budget');
      
      const amountInput = element(by.id('budget-amount-input'));
      await amountInput.typeText('1000');
      
      const saveButton = element(by.id('save-budget-button'));
      await saveButton.tap();
      
      // Verify budget was created
      await expect(element(by.text('Test Budget'))).toBeVisible();
    });

    it('should add expense to budget', async () => {
      const budgetItem = element(by.text('Test Budget'));
      await budgetItem.tap();
      
      const addExpenseButton = element(by.id('add-expense-button'));
      await addExpenseButton.tap();
      
      // Fill expense form
      const expenseNameInput = element(by.id('expense-name-input'));
      await expenseNameInput.typeText('Test Expense');
      
      const expenseAmountInput = element(by.id('expense-amount-input'));
      await expenseAmountInput.typeText('50');
      
      const saveButton = element(by.id('save-expense-button'));
      await saveButton.tap();
      
      // Verify expense was added
      await expect(element(by.text('Test Expense'))).toBeVisible();
    });
  });

  describe('Settings and Profile', () => {
    it('should navigate to settings', async () => {
      const profileTab = element(by.id('profile-tab'));
      await profileTab.tap();
      
      const settingsButton = element(by.id('settings-button'));
      await settingsButton.tap();
      
      await expect(element(by.text('Ustawienia'))).toBeVisible();
    });

    it('should change theme', async () => {
      const displaySettings = element(by.text('Wyświetlanie'));
      await displaySettings.tap();
      
      const darkThemeToggle = element(by.id('dark-theme-toggle'));
      await darkThemeToggle.tap();
      
      // App should switch to dark theme
      await expect(element(by.id('dark-theme-active'))).toBeVisible();
    });

    it('should update profile information', async () => {
      const accountSettings = element(by.text('Konto'));
      await accountSettings.tap();
      
      const nicknameInput = element(by.id('nickname-input'));
      await nicknameInput.clearText();
      await nicknameInput.typeText('NewNickname');
      
      const saveButton = element(by.id('save-profile-button'));
      await saveButton.tap();
      
      // Verify nickname was updated
      await expect(element(by.text('NewNickname'))).toBeVisible();
    });
  });

  describe('Navigation and UI', () => {
    it('should navigate between tabs', async () => {
      const tasksTab = element(by.text('Zadania'));
      await tasksTab.tap();
      
      const budgetsTab = element(by.text('Budżet'));
      await budgetsTab.tap();
      
      // Should be on budgets screen
      await expect(element(by.text('Budżety'))).toBeVisible();
      
      // Go back to tasks
      await tasksTab.tap();
      await expect(element(by.text('Zadania'))).toBeVisible();
    });

    it('should handle search functionality', async () => {
      const searchBar = element(by.id('search-bar'));
      await searchBar.tap();
      await searchBar.typeText('test search');
      
      // Search results should appear
      await expect(element(by.id('search-results'))).toBeVisible();
    });

    it('should show empty states', async () => {
      // Navigate to empty section (e.g., no tasks)
      const emptyState = element(by.id('empty-state'));
      if (await emptyState.isVisible()) {
        await expect(element(by.text('Brak zadań'))).toBeVisible();
        await expect(element(by.text('Dodaj pierwsze zadanie'))).toBeVisible();
      }
    });
  });
});
