import { Timestamp as FirestoreTimestamp } from "../utils/firestoreCompat";

// Użytkownicy i Pary
export interface UserProfile {
    email: string;
    points: number;
    pairId?: string;
    nickname?: string;
    photoURL?: string; // <-- DODANA NOWA WŁAŚCIWOŚĆ
    prioritySettings?: PrioritySettings;
    partnerNickname?: string;
    completedTasksCount?: number;
}

export interface Pair {
    id: string;
    members: string[];
    requesterId: string;
    status: 'pending' | 'active';
    requesterNickname?: string;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    userId: string;
}

// Zadania i Szablony
export interface Task {
    id: string;
    text: string;
    description: string;
    status: 'active' | 'archived';
    completed: boolean;
    userId: string;
    creatorNickname: string;
    isShared: boolean;
    pairId: string | null;
    basePriority: number;
    priority: number;
    difficulty: number;
    deadline: FirestoreTimestamp | null;
    createdAt: FirestoreTimestamp;
    category: string;
    completedBy?: string;
    completedAt?: FirestoreTimestamp;
    // Recurrence linkage (optional)
    seriesId?: string;
    occurrenceDate?: FirestoreTimestamp;
}

export interface Comment {
    id: string;
    text: string;
    authorId: string;
    authorNickname: string;
    createdAt: FirestoreTimestamp;
}

export interface ChoreTemplate {
    id: string;
    name: string;
    difficulty: number;
    category: string;
    userId: string;
}

// Budżety i Wydatki
export interface Budget {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    isShared: boolean;
    ownerId: string;
    pairId: string | null;
    members: string[];
}

export interface Expense {
    id: string;
    name: string;
    amount: number;
    budgetId: string;
    addedBy: string;
    addedByName: string;
    date: FirestoreTimestamp;
}

// Cykliczne serie zadań
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurringSeries {
    id: string;
    userId: string;
    pairId: string | null;
    templateId?: string; // opcjonalnie powiązany szablon
    name: string;
    description?: string;
    category: string;
    basePriority: number;
    difficulty: number;
    frequency: RecurrenceFrequency;
    interval: number; // co ile jednostek
    byWeekday?: number; // 0..6 (niedziela..sobota)
    byMonthDay?: number; // 1..31
    startDate: FirestoreTimestamp; // pierwszy dzień ważności serii
    endDate?: FirestoreTimestamp | null;
    isShared: boolean;
    skips?: string[]; // ISO date yyyy-mm-dd dla pominiętych instancji
}

// Ustawienia
export interface PrioritySettings {
    criticalThreshold: number;
    urgentThreshold: number;
    soonThreshold: number;
    distantThreshold: number;
    criticalBoost: number;
    urgentBoost: number;
    soonBoost: number;
    distantBoost: number;
    agingBoostDays: number;
    agingBoostAmount: number;
}