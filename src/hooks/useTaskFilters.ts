import { useState, useMemo, useCallback } from 'react';
import { Task, UserProfile } from '../types';

export interface TasksFilters {
    taskType: 'personal' | 'shared';
    activeCategories: string[];
    difficultyFilter: number[];
    creatorFilter: string | 'all';
    searchQuery: string;
    filterFromDate: Date | null;
    filterToDate: Date | null;
    deadlineFromDate: Date | null;
    deadlineToDate: Date | null;
    completedFromDate: Date | null;
    completedToDate: Date | null;
}

export const useTaskFilters = (
    rawTasks: Task[],
    userProfile: UserProfile | null,
    focusModeEnabled: boolean,
    initialFilters?: Partial<TasksFilters>
) => {
    // State for filters
    const [taskType, setTaskType] = useState<'personal' | 'shared'>(initialFilters?.taskType || 'personal');
    const [activeCategories, setActiveCategories] = useState<string[]>(initialFilters?.activeCategories || []);
    const [difficultyFilter, setDifficultyFilter] = useState<number[]>(initialFilters?.difficultyFilter || []);
    const [creatorFilter, setCreatorFilter] = useState<string | 'all'>(initialFilters?.creatorFilter || 'all');
    const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || '');

    // Date filters
    const [filterFromDate, setFilterFromDate] = useState<Date | null>(initialFilters?.filterFromDate || null);
    const [filterToDate, setFilterToDate] = useState<Date | null>(initialFilters?.filterToDate || null);
    const [deadlineFromDate, setDeadlineFromDate] = useState<Date | null>(initialFilters?.deadlineFromDate || null);
    const [deadlineToDate, setDeadlineToDate] = useState<Date | null>(initialFilters?.deadlineToDate || null);
    const [completedFromDate, setCompletedFromDate] = useState<Date | null>(initialFilters?.completedFromDate || null);
    const [completedToDate, setCompletedToDate] = useState<Date | null>(initialFilters?.completedToDate || null);

    // Consolidated Filter Object
    const filters: TasksFilters = useMemo(() => ({
        taskType,
        activeCategories,
        difficultyFilter,
        creatorFilter,
        searchQuery,
        filterFromDate,
        filterToDate,
        deadlineFromDate,
        deadlineToDate,
        completedFromDate,
        completedToDate,
    }), [taskType, activeCategories, difficultyFilter, creatorFilter, searchQuery, filterFromDate, filterToDate, deadlineFromDate, deadlineToDate, completedFromDate, completedToDate]);

    // Computed: Processed and Sorted Tasks
    const processedAndSortedTasks = useMemo(() => {
        const now = new Date();
        const oneDay = 1000 * 60 * 60 * 24;
        const settings = userProfile?.prioritySettings || {
            criticalThreshold: 1, urgentThreshold: 3, soonThreshold: 7, distantThreshold: 14,
            criticalBoost: 4, urgentBoost: 3, soonBoost: 2, distantBoost: 1,
            agingBoostDays: 5, agingBoostAmount: 1
        };

        const filteredTasks = rawTasks.filter(task => {
            const matchesTaskType = task.isShared === (taskType === 'shared');
            if (!matchesTaskType) return false;

            const matchesCategory = activeCategories.length === 0 || activeCategories.includes(task.category);
            if (!matchesCategory) return false;

            if (difficultyFilter.length > 0) {
                const taskDifficulty = (task.difficulty ?? 0) as number;
                if (!difficultyFilter.includes(taskDifficulty)) return false;
            }

            const taskCreatedAt = task.createdAt?.toDate ? task.createdAt.toDate() : null;
            if (taskCreatedAt) {
                if (filterFromDate) {
                    const fromTime = new Date(filterFromDate);
                    fromTime.setHours(0, 0, 0, 0);
                    if (taskCreatedAt.getTime() < fromTime.getTime()) return false;
                }
                if (filterToDate) {
                    const toTime = new Date(filterToDate);
                    toTime.setHours(23, 59, 59, 999);
                    if (taskCreatedAt.getTime() > toTime.getTime()) return false;
                }
            }

            const taskDeadline = task.deadline?.toDate?.();
            if (deadlineFromDate && taskDeadline) {
                const dFrom = new Date(deadlineFromDate); dFrom.setHours(0, 0, 0, 0);
                if (taskDeadline.getTime() < dFrom.getTime()) return false;
            }
            if (deadlineToDate && taskDeadline) {
                const dTo = new Date(deadlineToDate); dTo.setHours(23, 59, 59, 999);
                if (taskDeadline.getTime() > dTo.getTime()) return false;
            }

            const taskCompletedAt = task.completedAt?.toDate?.();
            if (completedFromDate && taskCompletedAt) {
                const cFrom = new Date(completedFromDate); cFrom.setHours(0, 0, 0, 0);
                if (taskCompletedAt.getTime() < cFrom.getTime()) return false;
            }
            if (completedToDate && taskCompletedAt) {
                const cTo = new Date(completedToDate); cTo.setHours(23, 59, 59, 999);
                if (taskCompletedAt.getTime() > cTo.getTime()) return false;
            }

            if (taskType === 'shared' && creatorFilter !== 'all') {
                if ((task.creatorNickname || '') !== creatorFilter) return false;
            }

            if (searchQuery.trim() !== '') {
                const lowerCaseQuery = searchQuery.toLowerCase();
                const matchesSearch = task.text.toLowerCase().includes(lowerCaseQuery) ||
                    (task.description && task.description.toLowerCase().includes(lowerCaseQuery));
                if (!matchesSearch) return false;
            }

            return true;
        });

        const mapped = filteredTasks
            .map(task => {
                let deadlineBoost = 0; let agingBoost = 0;
                if (task.deadline) {
                    const deadlineDate = (task.deadline as any)?.toDate ? (task.deadline as any).toDate() : new Date(task.deadline as any);
                    const diffDays = (deadlineDate.getTime() - now.getTime()) / oneDay;

                    if (diffDays < 0) deadlineBoost = settings.criticalBoost + 1;
                    else if (diffDays <= settings.criticalThreshold) deadlineBoost = settings.criticalBoost;
                    else if (diffDays <= settings.urgentThreshold) deadlineBoost = settings.urgentBoost;
                    else if (diffDays <= settings.soonThreshold) deadlineBoost = settings.soonBoost;
                    else if (diffDays <= settings.distantThreshold) deadlineBoost = settings.distantBoost;
                } else if (task.createdAt) {
                    const createdDate = (task.createdAt as any)?.toDate ? (task.createdAt as any).toDate() : new Date(task.createdAt as any);
                    const diffDays = (now.getTime() - createdDate.getTime()) / oneDay;
                    agingBoost = Math.floor(diffDays / settings.agingBoostDays) * settings.agingBoostAmount;
                }
                const dynamicPriority = Math.min(5, (task.basePriority || 3) + deadlineBoost + agingBoost);
                return { ...task, priority: dynamicPriority };
            })
            .sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                if (a.priority !== b.priority) return b.priority - a.priority;

                const deadlineA = (a.deadline as any)?.toMillis ? (a.deadline as any).toMillis() : (a.deadline ? new Date(a.deadline as any).getTime() : Infinity);
                const deadlineB = (b.deadline as any)?.toMillis ? (b.deadline as any).toMillis() : (b.deadline ? new Date(b.deadline as any).getTime() : Infinity);
                return deadlineA - deadlineB;
            });

        const focused = focusModeEnabled ? mapped.filter(t => !t.completed && (t.priority || 0) >= 4) : mapped;
        return focused;
    }, [
        rawTasks,
        userProfile,
        focusModeEnabled,
        filters // dependency on the consolidated object
    ]);

    const setFilters = useCallback((newFilters: Partial<TasksFilters>) => {
        if (newFilters.taskType !== undefined) setTaskType(newFilters.taskType);
        if (newFilters.activeCategories !== undefined) setActiveCategories(newFilters.activeCategories);
        if (newFilters.difficultyFilter !== undefined) setDifficultyFilter(newFilters.difficultyFilter);
        if (newFilters.creatorFilter !== undefined) setCreatorFilter(newFilters.creatorFilter);
        if (newFilters.searchQuery !== undefined) setSearchQuery(newFilters.searchQuery);
        // Dates
        if (newFilters.filterFromDate !== undefined) setFilterFromDate(newFilters.filterFromDate);
        if (newFilters.filterToDate !== undefined) setFilterToDate(newFilters.filterToDate);
        if (newFilters.deadlineFromDate !== undefined) setDeadlineFromDate(newFilters.deadlineFromDate);
        if (newFilters.deadlineToDate !== undefined) setDeadlineToDate(newFilters.deadlineToDate);
        if (newFilters.completedFromDate !== undefined) setCompletedFromDate(newFilters.completedFromDate);
        if (newFilters.completedToDate !== undefined) setCompletedToDate(newFilters.completedToDate);
    }, []);

    const todayTasks = useMemo(() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return processedAndSortedTasks.filter(t => {
            const deadline = (t.deadline as any)?.toDate ? (t.deadline as any).toDate() : (t.deadline ? new Date(t.deadline as any) : null);
            if (!deadline) return false;
            const time = deadline.getTime();
            return time < end.getTime(); // includes today and overdue
        }).slice(0, 5);
    }, [processedAndSortedTasks]);

    return {
        filters,
        setFilters,
        processedAndSortedTasks,
        todayTasks,
        // Individual setters exposed for convenience if needed, or just use setFilters
        setTaskType,
        setActiveCategories,
        setDifficultyFilter,
        setCreatorFilter,
        setSearchQuery,
        setFilterFromDate, setFilterToDate,
        setDeadlineFromDate, setDeadlineToDate,
        setCompletedFromDate, setCompletedToDate
    };
};
