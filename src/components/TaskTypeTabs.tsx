import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Glass } from '../styles/AppStyles';

interface Props {
    taskType: 'personal' | 'shared';
    onTaskTypeChange: (type: 'personal' | 'shared') => void;
}

const TaskTypeTabs: React.FC<Props> = ({ taskType, onTaskTypeChange }) => {
    const theme = useTheme();
    const isDark = theme.colorScheme === 'dark';
    const glassStyle = isDark ? Glass.dark : Glass.light;

    const trackBg = isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)';
    const activeBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)';
    const inactiveText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const activeText = isDark ? '#FFF' : '#000';

    return (
        <View style={styles.segmentedContainer}>
            <View style={[styles.segmentedTrack, { backgroundColor: trackBg }]}>
                <TouchableOpacity
                    style={[styles.segment, taskType === 'personal' && styles.segmentActive, taskType === 'personal' && { backgroundColor: activeBg }]}
                    onPress={() => onTaskTypeChange('personal')}
                >
                    <Text style={[styles.segmentText, { color: taskType === 'personal' ? activeText : inactiveText }]}>Osobiste</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segment, taskType === 'shared' && styles.segmentActive, taskType === 'shared' && { backgroundColor: activeBg }]}
                    onPress={() => onTaskTypeChange('shared')}
                >
                    <Text style={[styles.segmentText, { color: taskType === 'shared' ? activeText : inactiveText }]}>Wspólne</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    segmentedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.medium,
        marginBottom: 8,
    },
    segmentedTrack: {
        flex: 1,
        flexDirection: 'row',
        height: 40,
        borderRadius: 12,
        padding: 3,
    },
    segment: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    segmentActive: {
        // Subtle highlight instead of heavy shadow
    },
    segmentText: {
        fontWeight: '600',
        fontSize: 14,
    },
});

export default TaskTypeTabs;
