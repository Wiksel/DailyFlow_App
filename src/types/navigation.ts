import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type AuthStackParamList = {
  Login: undefined;
  Nickname: undefined;
};

export type TaskStackParamList = {
  Home: undefined;
  TaskDetail: { taskId: string };
  Profile: undefined;
  ChoreTemplates: { templateId?: string };
  Settings: undefined;
  AccountSettings: { openDeleteConfirm?: boolean } | undefined;
  Categories: undefined; 
  Archive: undefined;
  WeekPlan: undefined;
  RecurringSeries: undefined;
  Notifications: undefined;
  DisplaySettings: undefined;
};

export type BudgetStackParamList = {
  Budgets: undefined;
  BudgetDetail: { budgetId: string };
};

export type RootTabParamList = {
  TasksTab: NavigatorScreenParams<TaskStackParamList>;
  BudgetsTab: NavigatorScreenParams<BudgetStackParamList>;
};

export type TaskStackNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<TaskStackParamList>,
  BottomTabNavigationProp<RootTabParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}