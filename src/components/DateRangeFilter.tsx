import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';

interface DateRangeFilterProps {
    label: string;
    fromDate: Date | null;
    toDate: Date | null;
    onFromDateChange: (date: Date | null) => void;
    onToDateChange: (date: Date | null) => void;
    predefinedRanges?: boolean;
}

type DatePickerMode = 'from' | 'to' | null;

const DateRangeFilter = ({
    label,
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    predefinedRanges = true,
}: DateRangeFilterProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDatePickerFor, setShowDatePickerFor] = useState<DatePickerMode>(null);

    const handlePredefinedRange = (rangeType: string) => {
        const now = new Date();
        let newFromDate: Date | null = null;
        let newToDate: Date | null = new Date(now);
        newToDate.setHours(23, 59, 59, 999);

        switch (rangeType) {
            case 'today':
                newFromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                newFromDate.setHours(0, 0, 0, 0);
                break;
            case 'last7days':
                newFromDate = new Date(now);
                newFromDate.setDate(now.getDate() - 7);
                newFromDate.setHours(0, 0, 0, 0);
                break;
            case 'last14days':
                newFromDate = new Date(now);
                newFromDate.setDate(now.getDate() - 14);
                newFromDate.setHours(0, 0, 0, 0);
                break;
            case 'last30days':
            case 'lastMonth':
                newFromDate = new Date(now);
                newFromDate.setMonth(now.getMonth() - 1);
                newFromDate.setHours(0, 0, 0, 0);
                break;
            case 'last3months':
                newFromDate = new Date(now);
                newFromDate.setMonth(now.getMonth() - 3);
                newFromDate.setHours(0, 0, 0, 0);
                break;
            case 'last6months':
                newFromDate = new Date(now);
                newFromDate.setMonth(now.getMonth() - 6);
                newFromDate.setHours(0, 0, 0, 0);
                break;
            case 'lastYear':
                newFromDate = new Date(now);
                newFromDate.setFullYear(now.getFullYear() - 1);
                newFromDate.setHours(0, 0, 0, 0);
                break;
            case 'all':
                newFromDate = null;
                newToDate = null;
                break;
            default:
                break;
        }
        onFromDateChange(newFromDate);
        onToDateChange(newToDate);
    };

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        // Obsługa anulowania/zamknięcia datepickera
        if (Platform.OS === 'android') {
            if (event.type === 'dismissed' || event.type === 'neutralButtonPressed') {
                setShowDatePickerFor(null);
                return;
            }
        } else if (Platform.OS === 'ios') {
            if (event.type === 'dismissed') {
                setShowDatePickerFor(null);
                return;
            }
        }
        
        let finalSelectedDate = selectedDate;
        // Na iOS selectedDate może być undefined, jeśli anulowano, ale timestamp w nativeEvent jest dostępny
        if (Platform.OS === 'ios' && event.nativeEvent && event.nativeEvent.timestamp && !finalSelectedDate) {
            finalSelectedDate = new Date(event.nativeEvent.timestamp);
        }

        setShowDatePickerFor(null); // Zawsze zamykamy datepicker po próbie ustawienia daty

        if (event.type === 'set' && finalSelectedDate) {
            if (showDatePickerFor === 'from') {
                finalSelectedDate.setHours(0, 0, 0, 0);
                if (toDate && finalSelectedDate.getTime() > toDate.getTime()) {
                    Alert.alert("Błąd daty", "Data początkowa nie może być późniejsza niż data końcowa.");
                    return;
                }
                onFromDateChange(finalSelectedDate);
            } else if (showDatePickerFor === 'to') {
                finalSelectedDate.setHours(23, 59, 59, 999);
                if (fromDate && finalSelectedDate.getTime() < fromDate.getTime()) {
                    Alert.alert("Błąd daty", "Data końcowa nie może być wcześniejsza niż data początkowa.");
                    return;
                }
                onToDateChange(finalSelectedDate);
            }
        }
    };

    const isFilterActive = fromDate !== null || toDate !== null;

    const renderPredefinedRanges = () => {
        if (!predefinedRanges) return null;
        const ranges = [
            { key: 'all', text: 'Wszystkie' },
            { key: 'today', text: 'Dziś' },
            { key: 'last7days', text: 'Ostatnie 7 dni' },
            { key: 'last14days', text: 'Ostatnie 14 dni' },
            { key: 'last30days', text: 'Ostatnie 30 dni' },
            { key: 'last3months', text: 'Ostatnie 3 mies.' },
            { key: 'last6months', text: 'Ostatnie 6 mies.' },
            { key: 'lastYear', text: 'Ostatni rok' },
        ];

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.predefinedRangesContainer}>
                {ranges.map((range) => (
                    <TouchableOpacity
                        key={range.key}
                        style={styles.predefinedButton}
                        onPress={() => handlePredefinedRange(range.key)}
                    >
                        <Text style={styles.predefinedButtonText}>{range.text}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.headerButton}>
                <Text style={[styles.headerLabel, isFilterActive && styles.headerLabelActive]}>{label}</Text>
                <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={isFilterActive ? '#0782F9' : '#666'} />
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.expandedContent}>
                    {renderPredefinedRanges()}
                    
                    {/* DODANA PRZERWA między przyciskami a polami dat */}
                    <View style={styles.contentSeparator}></View>

                    <View style={styles.datePickerRow}>
                        {/* Przycisk OD z ikoną kalendarza */}
                        <TouchableOpacity onPress={() => setShowDatePickerFor('from')} style={[styles.datePickerButton, { marginRight: 10 }]}>
                            <Feather name="calendar" size={18} color="#333" style={styles.calendarIcon} />
                            <Text style={styles.datePickerText}>{fromDate ? fromDate.toLocaleDateString('pl-PL') : 'Od'}</Text>
                        </TouchableOpacity>
                        {fromDate && (
                            <TouchableOpacity onPress={() => onFromDateChange(null)} style={styles.clearDateButton}>
                                <Feather name="x-circle" size={18} color="#e74c3c" />
                            </TouchableOpacity>
                        )}
                        {/* DateTimePicker renderowany warunkowo */}
                        {showDatePickerFor !== null && ( // Renderuj DateTimePicker tylko jeśli tryb jest ustawiony
                            <DateTimePicker
                                value={
                                    showDatePickerFor === 'from' 
                                        ? (fromDate || new Date()) 
                                        : (toDate || new Date())
                                }
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'} // Na iOS spinner dla lepszego UI
                                onChange={handleDateChange}
                            />
                        )}

                        {/* Przycisk DO z ikoną kalendarza */}
                        <TouchableOpacity onPress={() => setShowDatePickerFor('to')} style={styles.datePickerButton}>
                            <Feather name="calendar" size={18} color="#333" style={styles.calendarIcon} />
                            <Text style={styles.datePickerText}>{toDate ? toDate.toLocaleDateString('pl-PL') : 'Do'}</Text>
                        </TouchableOpacity>
                        {toDate && (
                            <TouchableOpacity onPress={() => onToDateChange(null)} style={styles.clearDateButton}>
                                <Feather name="x-circle" size={18} color="#e74c3c" />
                            </TouchableOpacity>
                        )}
                        {/* DateTimePicker dla 'to' jest już obsługiwany przez jeden wspólny */}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: '#eee',
        padding: 0,
    },
    headerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    headerLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    headerLabelActive: {
        color: '#0782F9',
    },
    expandedContent: {
        padding: 15,
        paddingTop: 0,
    },
    predefinedRangesContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        minHeight: 40,
    },
    predefinedButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#e9e9e9',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    predefinedButtonText: {
        color: '#333',
        fontWeight: '500',
        fontSize: 13,
    },
    contentSeparator: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 10, // Zapewnia przerwę
    },
    datePickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 12,
        flex: 1,
        marginBottom: 10,
        justifyContent: 'center',
        minWidth: '45%',
        position: 'relative',
    },
    calendarIcon: {
        marginRight: 8,
    },
    datePickerText: {
        fontSize: 14,
        color: '#333',
    },
    clearDateButton: {
        padding: 5,
        position: 'absolute',
        right: 5,
        top: 5,
        zIndex: 1,
    },
});

export default DateRangeFilter;