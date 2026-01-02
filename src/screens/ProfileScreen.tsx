import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '../utils/authCompat';
import { db } from '../utils/firestoreCompat';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, writeBatch, updateDoc, deleteDoc, addDoc, QuerySnapshotCompat } from '../utils/firestoreCompat';
import { TaskStackNavigationProp } from '../types/navigation';
import { UserProfile, Pair } from '../types';
import { useToast } from '../contexts/ToastContext';
import ActionButton from '../components/ActionButton';
import ActionModal from '../components/ActionModal';
import { Feather } from '@expo/vector-icons';
import { Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import AppHeader from '../components/AppHeader';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { useTheme, Theme } from '../contexts/ThemeContext';

const ProfileScreen = () => {
    const navigation = useNavigation<TaskStackNavigationProp>();
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { showToast } = useToast();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [nickname, setNickname] = useState('');
    const [partnerEmail, setPartnerEmail] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [incomingInvites, setIncomingInvites] = useState<Pair[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPairActionLoading, setIsPairActionLoading] = useState(false);
    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const currentUser = getAuth().currentUser;

    useEffect(() => {
        if (!currentUser) return;
        const userUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnapshot) => {
            if (!docSnapshot.exists()) {
                setUserProfile(null);
                setNickname('');
                setPartnerEmail('');
                setLoading(false);
                return;
            }
            const profileData = docSnapshot.data() as UserProfile;
            setUserProfile(profileData);
            setNickname(profileData?.nickname || '');
            if (profileData?.pairId) {
                fetchPartnerEmail(profileData.pairId);
            } else {
                setPartnerEmail('');
            }
            setLoading(false);
        });

        const invitesQuery = query(collection(db, 'pairs'), where('members', 'array-contains', currentUser.uid), where('status', '==', 'pending'));
        const invitesUnsubscribe = onSnapshot(invitesQuery, async (snapshot: QuerySnapshotCompat) => {
            const invitesPromises = snapshot.docs
                .map(doc => ({ ...doc.data(), id: doc.id } as Pair))
                .filter(pair => pair.requesterId !== currentUser.uid)
                .map(async (pair) => {
                    const requesterDoc = await getDoc(doc(db, 'users', pair.requesterId));
                    const requesterNickname = requesterDoc.data()?.nickname || 'Nieznany użytkownik';
                    return { ...pair, requesterNickname };
                });
            const populatedInvites = await Promise.all(invitesPromises);
            setIncomingInvites(populatedInvites);
        });
        return () => { userUnsubscribe(); invitesUnsubscribe(); };
    }, [currentUser]);

    const fetchPartnerEmail = async (pairId: string) => {
        if (!currentUser) return;
        const pairDoc = await getDoc(doc(db, 'pairs', pairId));
        if (!pairDoc.exists()) return;
        const pairData = pairDoc.data() as any;
        const members: string[] = Array.isArray(pairData?.members) ? pairData.members : [];
        const partnerId = members.find((id: string) => id !== currentUser.uid);
        if (partnerId) {
            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
            if (partnerDoc.exists()) setPartnerEmail((partnerDoc.data() as any)?.email ?? null);
        }
    };

    const handleSaveNickname = async () => {
        if (!nickname.trim() || !currentUser) return;
        setIsSaving(true);
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { nickname: nickname.trim() });
            showToast("Twój nick został zaktualizowany.", 'success');
        } catch (error: any) {
            showToast("Wystąpił błąd podczas zapisu nicku.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendInvite = async () => {
        if (!currentUser || !inviteEmail.trim()) return;
        if (inviteEmail.trim().toLowerCase() === currentUser.email?.toLowerCase()) {
            showToast("Nie możesz zaprosić samego siebie.", 'error');
            return;
        }
        setIsPairActionLoading(true);
        try {
            // Prefer publicUsers for lookup by lower-cased email
            const pubRef = collection(db, 'publicUsers');
            const q = query(pubRef, where("emailLower", "==", inviteEmail.trim().toLowerCase()));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                showToast("Nie znaleziono użytkownika \no podanym adresie e-mail.", 'error');
                setIsPairActionLoading(false);
                return;
            }
            const targetUser = querySnapshot.docs[0];
            await addDoc(collection(db, 'pairs'), {
                members: [currentUser.uid, targetUser.id],
                status: 'pending',
                requesterId: currentUser.uid,
            });
            showToast("Zaproszenie zostało wysłane!", 'success');
            setInviteEmail('');
        } catch (error: any) {
            showToast('Błąd wysyłania zaproszenia.', 'error');
        } finally {
            setIsPairActionLoading(false);
        }
    };

    const handleAcceptInvite = async (pair: Pair) => {
        if (!currentUser) return;
        setIsPairActionLoading(true);
        try {
            const batch = writeBatch(db);
            const pairRef = doc(db, 'pairs', pair.id);
            batch.update(pairRef, { status: 'active' });
            const currentUserRef = doc(db, 'users', currentUser.uid);
            batch.update(currentUserRef, { pairId: pair.id });
            const partnerId = pair.members.find(id => id !== currentUser.uid);
            if (partnerId) {
                batch.update(doc(db, 'users', partnerId), { pairId: pair.id });
            }
            await batch.commit();
            showToast("Gratulacje! Jesteście w parze.", 'success');
        } catch (error: any) {
            showToast('Błąd akceptacji zaproszenia.', 'error');
        } finally {
            setIsPairActionLoading(false);
        }
    };

    const handleDeclineInvite = async (pairId: string) => {
        setIsPairActionLoading(true);
        try {
            await deleteDoc(doc(db, 'pairs', pairId));
            showToast("Zaproszenie odrzucone.", 'success');
        } catch (error: any) {
            showToast('Błąd odrzucenia zaproszenia.', 'error');
        } finally {
            setIsPairActionLoading(false);
        }
    };

    const handleLeavePair = async () => {
        if (!userProfile?.pairId || !currentUser) return;
        setIsPairActionLoading(true);
        try {
            const batch = writeBatch(db);
            const pairRef = doc(db, 'pairs', userProfile.pairId);
            const pairDoc = await getDoc(pairRef);
            if (pairDoc.exists()) {
                const pairData2 = pairDoc.data() as any;
                const members = Array.isArray(pairData2?.members) ? pairData2.members : undefined;
                if (members) {
                    for (const uid of members) {
                        batch.update(doc(db, 'users', uid), { pairId: null });
                    }
                }
            }
            batch.delete(pairRef);
            await batch.commit();
            showToast("Opuściłeś parę.", 'success');
        } catch (error: any) {
            showToast('Błąd opuszczania pary.', 'error');
        } finally {
            setIsPairActionLoading(false);
        }
    };

    const handleLogout = () => {
        getAuth().signOut().catch(error => {
            console.error("Błąd wylogowania:", error);
        });
    };

    const deleteAccountData = async (uid: string) => {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', uid);
        batch.delete(userRef);

        const categoriesSnap = await getDocs(query(collection(db, 'categories'), where('userId', '==', uid)));
        categoriesSnap.forEach((d) => batch.delete(doc(db, 'categories', d.id)));

        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('userId', '==', uid)));
        tasksSnap.forEach((d) => batch.delete(doc(db, 'tasks', d.id)));

        const pairsSnap = await getDocs(query(collection(db, 'pairs'), where('members', 'array-contains', uid)));
        pairsSnap.forEach((d) => batch.delete(doc(db, 'pairs', d.id)));

        await batch.commit();
    };

    const handleConfirmDelete = async () => {
        const currentUser = getAuth().currentUser;
        if (!currentUser) return;
        setConfirmDeleteVisible(false);
        setIsDeleting(true);
        try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const pairId = userDoc.data()?.pairId;
            if (pairId) {
                showToast('Najpierw opuść parę w Profilu, a potem usuń konto.', 'error');
                return;
            }

            await deleteAccountData(currentUser.uid);
            await currentUser.delete();
            showToast('Konto zostało usunięte.', 'success');
            try { await getAuth().signOut(); } catch { }
        } catch (e: any) {
            if (e?.code === 'auth/requires-recent-login') {
                showToast('Ta operacja wymaga ponownego logowania.', 'error');
            } else {
                showToast('Nie udało się usunąć konta.', 'error');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <View style={[GlobalStyles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <AppHeader title="Profil i para" />
            <Animated.View layout={Layout.springify()} style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                    {userProfile?.photoURL ? (
                        <Image source={{ uri: userProfile.photoURL }} style={styles.avatarImage} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {userProfile?.nickname ? userProfile.nickname.charAt(0).toUpperCase() : '?'}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.nicknameText}>{userProfile?.nickname || 'Brak nicku'}</Text>
                <Text style={styles.emailText}>{currentUser?.email}</Text>
            </Animated.View>

            <Animated.View layout={Layout.springify()} style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Feather name="star" size={24} color={theme.colors.warning} />
                    <Text style={styles.statValue}>{userProfile?.points ?? 0}</Text>
                    <Text style={styles.statLabel}>Zdobyte punkty</Text>
                </View>
                <View style={styles.statCard}>
                    <Feather name="check-circle" size={24} color={theme.colors.success} />
                    <Text style={styles.statValue}>{userProfile?.completedTasksCount ?? 0}</Text>
                    <Text style={styles.statLabel}>Ukończone zadania</Text>
                </View>
            </Animated.View>

            <Animated.View layout={Layout.springify()} style={styles.card}>
                <Text style={styles.sectionTitle}>Zaproś do pary</Text>
                <TextInput
                    style={styles.input}
                    placeholder="E-mail partnera"
                    placeholderTextColor={theme.colors.placeholder}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    autoCapitalize="none"
                    editable={!isPairActionLoading}
                />
                <ActionButton
                    title="Wyślij zaproszenie"
                    onPress={handleSendInvite}
                    isLoading={isPairActionLoading}
                    style={styles.primaryButton}
                />
            </Animated.View>

            <Animated.View layout={Layout.springify()} style={styles.card}>
                <Text style={styles.sectionTitle}>Zarządzanie</Text>
                <ActionButton title="Zarządzaj kategoriami" onPress={() => navigation.navigate('Categories')} style={styles.manageButton} />
                <ActionButton title="Szablony obowiązków" onPress={() => navigation.navigate('ChoreTemplates', {})} style={styles.manageButton} />
                <ActionButton title="Ustawienia priorytetów" onPress={() => navigation.navigate('Settings')} style={styles.manageButton} />
                <ActionButton title="Ustawienia konta" onPress={() => navigation.navigate('AccountSettings')} style={styles.manageButton} />
                <ActionButton title="Ustawienia wyświetlania" onPress={() => navigation.navigate('DisplaySettings')} style={styles.manageButton} />
                <ActionButton title="Kolejka offline" onPress={() => navigation.navigate('Outbox')} style={styles.manageButton} />
                <View style={styles.separator} />
            </Animated.View>

            {userProfile?.pairId ? (
                <Animated.View layout={Layout.springify()} style={styles.card}>
                    <Text style={styles.sectionTitle}>Twoja para</Text>
                    <Text style={styles.pairInfo}>Jesteś w parze z: <Text style={styles.pairEmail}>{partnerEmail}</Text></Text>
                    <ActionButton
                        title="Opuść parę"
                        onPress={handleLeavePair}
                        isLoading={isPairActionLoading}
                        style={styles.dangerButton}
                    />
                </Animated.View>
            ) : (
                <>
                    {incomingInvites.length > 0 && (
                        <Animated.View entering={FadeInUp.delay(240)} layout={Layout.springify()} style={styles.card}>
                            <Text style={styles.sectionTitle}>Oczekujące zaproszenia</Text>
                            {incomingInvites.map(invite => (
                                <View key={invite.id} style={styles.inviteContainer}>
                                    <Text style={styles.inviteText}>Zaproszenie od: <Text style={styles.pairEmail}>{invite.requesterNickname}</Text></Text>
                                    <View style={styles.inviteActions}>
                                        <ActionButton
                                            title="Akceptuj"
                                            onPress={() => handleAcceptInvite(invite)}
                                            isLoading={isPairActionLoading}
                                            style={styles.successButton}
                                        />
                                        <ActionButton
                                            title="Odrzuć"
                                            onPress={() => handleDeclineInvite(invite.id)}
                                            isLoading={isPairActionLoading}
                                            style={styles.dangerButton}
                                        />
                                    </View>
                                </View>
                            ))}
                        </Animated.View>
                    )}
                </>
            )}
            <ActionButton
                title="Wyloguj się"
                onPress={handleLogout}
                style={styles.logoutButton}
            />
        </ScrollView>
    );
};

const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        ...GlobalStyles.container,
        backgroundColor: theme.colors.background,
    },
    card: {
        ...GlobalStyles.card,
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
    },
    profileSection: {
        padding: Spacing.large,
        backgroundColor: theme.colors.card,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        marginHorizontal: Spacing.medium,
        marginTop: Spacing.medium,
        borderRadius: 16,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.medium,
        borderWidth: 3,
        borderColor: theme.colors.primary,
        backgroundColor: 'transparent',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
    },
    avatarText: {
        color: '#ffffff', // Always white on primary
        fontSize: 48,
        fontWeight: 'bold',
    },
    nicknameText: {
        ...Typography.h2,
        color: theme.colors.textPrimary,
    },
    emailText: {
        ...Typography.body,
        marginTop: Spacing.xSmall,
        color: theme.colors.textSecondary,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingVertical: Spacing.medium,
        backgroundColor: theme.colors.card,
        marginHorizontal: Spacing.medium,
        marginTop: Spacing.medium,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    statCard: { alignItems: 'center', flex: 1 },
    statValue: { ...Typography.h2, marginTop: Spacing.xSmall, color: theme.colors.textPrimary },
    statLabel: { ...Typography.small, fontSize: 14, marginTop: 2, color: theme.colors.textSecondary },
    sectionTitle: { ...Typography.h3, marginBottom: Spacing.medium, color: theme.colors.textPrimary },
    input: {
        ...GlobalStyles.input,
        backgroundColor: theme.colors.inputBackground,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
    },
    manageButton: { marginBottom: Spacing.small, backgroundColor: theme.colors.primary },
    primaryButton: { marginTop: Spacing.small, backgroundColor: theme.colors.primary },
    settingsButton: { backgroundColor: theme.colors.secondary },
    purpleButton: { backgroundColor: theme.colors.purple },
    pairInfo: { ...Typography.body, textAlign: 'center', marginBottom: Spacing.medium, color: theme.colors.textSecondary },
    pairEmail: { ...Typography.bold, color: theme.colors.textPrimary },
    dangerButton: { backgroundColor: theme.colors.danger },
    inviteContainer: {
        marginBottom: Spacing.medium,
        padding: Spacing.medium,
        borderWidth: 1,
        borderRadius: 8,
        borderColor: theme.colors.border,
    },
    inviteText: { ...Typography.body, marginBottom: Spacing.small, color: theme.colors.textSecondary },
    inviteActions: { flexDirection: 'row', justifyContent: 'space-around', gap: Spacing.small },
    successButton: { flex: 1, backgroundColor: theme.colors.success },
    logoutButton: { marginHorizontal: Spacing.medium, marginTop: Spacing.medium, marginBottom: Spacing.small, backgroundColor: theme.colors.textSecondary },
    separator: { height: 1, backgroundColor: theme.colors.border, marginTop: Spacing.medium },
});

export default ProfileScreen;
