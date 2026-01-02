
export const safeToIsoString = (date: any): string | null => {
    if (!date) return null;

    let d: Date | null = null;

    // Handle Firestore Timestamp (duck typing to avoid heavy imports/circular deps)
    if (date?.toDate && typeof date.toDate === 'function') {
        try {
            d = date.toDate();
        } catch {
            return null;
        }
    }
    // Handle Standard Date object
    else if (date instanceof Date) {
        d = date;
    }
    // Handle String/Number
    else if (typeof date === 'string' || typeof date === 'number') {
        d = new Date(date);
    }

    // specific check for invalid date
    if (d && !isNaN(d.getTime())) {
        return d.toISOString();
    }

    return null;
};

export const safeToDate = (date: any): Date | null => {
    if (!date) return null;

    let d: Date | null = null;

    if (date?.toDate && typeof date.toDate === 'function') {
        try { d = date.toDate(); } catch { return null; }
    } else if (date instanceof Date) {
        d = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
        d = new Date(date);
    }

    if (d && !isNaN(d.getTime())) {
        return d;
    }

    return null;
};
