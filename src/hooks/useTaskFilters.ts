import { useState, useMemo, useCallback } from 'react';
import { Task, UserProfile } from '../types';

export interface TasksFilters {
    taskType: 'personal' | 'shared';
    activeCategories: string[];
    activeTimeFilters: string[];
    difficultyFilter: number[];
    creatorFilter: string | 'all';
    searchQuery: string;
    filterFromDate: Date | null;
    filterToDate: Date | null;
    deadlineFromDate: Date | null;
    deadlineToDate: Date | null;
    completedFromDate: Date | null;
    completedToDate: Date | null;
    priorityFilter: number[];
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
    const [activeTimeFilters, setActiveTimeFilters] = useState<string[]>(initialFilters?.activeTimeFilters || ['all']);
    const [difficultyFilter, setDifficultyFilter] = useState<number[]>(initialFilters?.difficultyFilter || []);
    const [priorityFilter, setPriorityFilter] = useState<number[]>(initialFilters?.priorityFilter || []);
    const [creatorFilter, setCreatorFilter] = useState<string | 'all'>(initialFilters?.creatorFilter || 'all');
    const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || '');

    // Date filters (Manual/Advanced)
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
        activeTimeFilters,
        difficultyFilter,
        creatorFilter,
        searchQuery,
        filterFromDate,
        filterToDate,
        deadlineFromDate,
        deadlineToDate,
        completedFromDate,
        completedToDate,
        priorityFilter,
    }), [taskType, activeCategories, activeTimeFilters, difficultyFilter, priorityFilter, creatorFilter, searchQuery, filterFromDate, filterToDate, deadlineFromDate, deadlineToDate, completedFromDate, completedToDate]);

    // Computed: Processed and Sorted Tasks
    const processedAndSortedTasks = useMemo(() => {
        const now = new Date();
        const oneDay = 1000 * 60 * 60 * 24;
        const settings = userProfile?.prioritySettings || {
            criticalThreshold: 1, urgentThreshold: 3, soonThreshold: 7, distantThreshold: 14,
            criticalBoost: 4, urgentBoost: 3, soonBoost: 2, distantBoost: 1,
            agingBoostDays: 5, agingBoostAmount: 1
        };

        const safeDate = (d: any) => {
            if (!d) return null;
            if (d.toDate) return d.toDate();
            const date = new Date(d);
            return isNaN(date.getTime()) ? null : date;
        };

        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
        const todayStartVal = todayStart.getTime();
        const todayEndVal = todayEnd.getTime();

        const tmrwStart = new Date(todayStart); tmrwStart.setDate(tmrwStart.getDate() + 1);
        const tmrwEnd = new Date(todayEnd); tmrwEnd.setDate(tmrwEnd.getDate() + 1);
        const tmrwStartVal = tmrwStart.getTime();
        const tmrwEndVal = tmrwEnd.getTime();

        const nextWeek = new Date(todayEnd); nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekVal = nextWeek.getTime();

        const thirtyDaysAgo = new Date(todayStart); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoVal = thirtyDaysAgo.getTime();

        const activeTimeSet = new Set(activeTimeFilters);
        const hasQuickFilters = activeTimeSet.size > 0 && !activeTimeSet.has('all');

        const filteredTasks = rawTasks.filter(task => {
            const matchesTaskType = task.isShared === (taskType === 'shared');
            if (!matchesTaskType) return false;

            const matchesCategory = activeCategories.length === 0 || activeCategories.includes(task.category);
            if (!matchesCategory) return false;

            if (difficultyFilter.length > 0) {
                const taskDifficulty = (task.difficulty ?? 0) as number;
                if (!difficultyFilter.includes(taskDifficulty)) return false;
            }

            if (filters.priorityFilter && filters.priorityFilter.length > 0) {
                if (!filters.priorityFilter.includes(task.basePriority)) return false;
            }

            const taskDeadline = safeDate(task.deadline);
            const taskCompletedAt = safeDate(task.completedAt);
            const taskCreatedAt = safeDate(task.createdAt);

            const taskDeadlineVal = taskDeadline ? taskDeadline.getTime() : null;

            // Time Filters Logic (OR)
            if (hasQuickFilters) {
                const matchesAnyTime = activeTimeFilters.some(filter => {
                    switch (filter) {
                        case 'today':
                            if (!taskDeadlineVal) return false;
                            if (task.completed) return false;
                            return taskDeadlineVal >= todayStartVal && taskDeadlineVal <= todayEndVal;
                        case 'tomorrow':
                            if (!taskDeadlineVal) return false;
                            if (task.completed) return false;
                            return taskDeadlineVal >= tmrwStartVal && taskDeadlineVal <= tmrwEndVal;
                        case 'upcoming':
                            if (!taskDeadlineVal) return false;
                            if (task.completed) return false;
                            return taskDeadlineVal >= todayStartVal && taskDeadlineVal <= nextWeekVal;
                        case 'overdue':
                            if (!taskDeadlineVal) return false;
                            if (task.completed) return false;
                            return taskDeadlineVal < todayStartVal;
                        case 'completed':
                            if (!task.completed) return false;
                            if (!taskCompletedAt) return false;
                            return taskCompletedAt.getTime() >= thirtyDaysAgoVal;
                        default: return false;
                    }
                });
                if (!matchesAnyTime) return false;
            } else {
                if (taskCreatedAt) {
                    const tVal = taskCreatedAt.getTime();
                    if (filterFromDate) {
                        const fromTime = new Date(filterFromDate); fromTime.setHours(0, 0, 0, 0);
                        if (tVal < fromTime.getTime()) return false;
                    }
                    if (filterToDate) {
                        const toTime = new Date(filterToDate); toTime.setHours(23, 59, 59, 999);
                        if (tVal > toTime.getTime()) return false;
                    }
                }

                if (deadlineFromDate) {
                    if (!taskDeadlineVal) return false;
                    const dFrom = new Date(deadlineFromDate); dFrom.setHours(0, 0, 0, 0);
                    if (taskDeadlineVal < dFrom.getTime()) return false;
                }
                if (deadlineToDate) {
                    if (!taskDeadlineVal) return false;
                    const dTo = new Date(deadlineToDate); dTo.setHours(23, 59, 59, 999);
                    if (taskDeadlineVal > dTo.getTime()) return false;
                }

                if (completedFromDate) {
                    if (!taskCompletedAt) return false;
                    const cFrom = new Date(completedFromDate); cFrom.setHours(0, 0, 0, 0);
                    if (taskCompletedAt.getTime() < cFrom.getTime()) return false;
                }
                if (completedToDate) {
                    if (!taskCompletedAt) return false;
                    const cTo = new Date(completedToDate); cTo.setHours(23, 59, 59, 999);
                    if (taskCompletedAt.getTime() > cTo.getTime()) return false;
                }
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
                let deadlineTime = Infinity;

                const taskDeadline = safeDate(task.deadline);
                if (taskDeadline) {
                    deadlineTime = taskDeadline.getTime();
                    const diffDays = (deadlineTime - now.getTime()) / oneDay;

                    if (diffDays < 0) deadlineBoost = settings.criticalBoost + 1;
                    else if (diffDays <= settings.criticalThreshold) deadlineBoost = settings.criticalBoost;
                    else if (diffDays <= settings.urgentThreshold) deadlineBoost = settings.urgentBoost;
                    else if (diffDays <= settings.soonThreshold) deadlineBoost = settings.soonBoost;
                    else if (diffDays <= settings.distantThreshold) deadlineBoost = settings.distantBoost;
                } else if (task.createdAt) {
                    const createdDate = safeDate(task.createdAt);
                    if (createdDate) {
                        const diffDays = (now.getTime() - createdDate.getTime()) / oneDay;
                        agingBoost = Math.floor(diffDays / settings.agingBoostDays) * settings.agingBoostAmount;
                    }
                }
                const dynamicPriority = Math.min(5, (task.basePriority || 3) + deadlineBoost + agingBoost);
                return { ...task, priority: dynamicPriority, _sortDeadline: deadlineTime };
            })
            .sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                if (a.priority !== b.priority) return b.priority - a.priority;
                return (a as any)._sortDeadline - (b as any)._sortDeadline;
            });

        // Focus Mode Logic:
        const isCompletedView = activeTimeFilters.includes('completed');
        const effectiveFocusMode = isCompletedView ? false : focusModeEnabled;

        const focused = effectiveFocusMode ? mapped.filter(t => !t.completed && (t.priority || 0) >= 4) : mapped;
        return focused;
    }, [
        rawTasks,
        userProfile,
        focusModeEnabled,
        filters
    ]);



    const toggleTimeFilter = useCallback((filter: string) => {
        if (filter === 'all') {
            setActiveTimeFilters(['all']);
        } else {
            setActiveTimeFilters(prev => {
                const current = prev.includes('all') ? [] : prev;
                if (current.includes(filter)) {
                    const next = current.filter(f => f !== filter);
                    return next.length === 0 ? ['all'] : next;
                } else {
                    return [...current, filter];
                }
            });
        }
        // Clear manual dates when using quick filters to avoid confusion
        setFilterFromDate(null); setFilterToDate(null);
        setDeadlineFromDate(null); setDeadlineToDate(null);
        setCompletedFromDate(null); setCompletedToDate(null);
    }, []);

    const setFilters = useCallback((newFilters: Partial<TasksFilters>) => {
        if (newFilters.taskType !== undefined) setTaskType(newFilters.taskType);
        if (newFilters.activeCategories !== undefined) setActiveCategories(newFilters.activeCategories);
        if (newFilters.activeTimeFilters !== undefined) setActiveTimeFilters(newFilters.activeTimeFilters);
        if (newFilters.difficultyFilter !== undefined) setDifficultyFilter(newFilters.difficultyFilter);
        if (newFilters.priorityFilter !== undefined) setPriorityFilter(newFilters.priorityFilter);
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
            return time < end.getTime();
        }).slice(0, 5);
    }, [processedAndSortedTasks]);

    return {
        filters,
        setFilters,
        toggleTimeFilter,
        processedAndSortedTasks,
        todayTasks,
        setTaskType,
        setActiveCategories,
        setDifficultyFilter,
        setPriorityFilter,
        setCreatorFilter,
        setSearchQuery,
        setFilterFromDate, setFilterToDate,
        setDeadlineFromDate, setDeadlineToDate,
        setCompletedFromDate, setCompletedToDate
    };
};
