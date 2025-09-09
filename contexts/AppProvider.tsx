import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { AppContext } from './AppContext';
import type { UserProfile, TimelineEntry, TestRecord, Report, Message } from '../types';
import { getUserProfile, saveUserProfile } from '../services/localStorageService';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user profile from local storage on mount
    useEffect(() => {
        try {
            const profile = getUserProfile();
            setUserProfileState(profile);
        } catch (error) {
            console.error("Failed to load user profile:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Wrap setUserProfile to also save to local storage
    const setUserProfile = useCallback((profile: UserProfile | null) => {
        try {
            setUserProfileState(profile);
            if (profile) {
                saveUserProfile(profile);
            } else {
                localStorage.removeItem('examito_user_profile');
            }
        } catch (error) {
            console.error("Failed to save user profile:", error);
        }
    }, []);

    const addTimelineEntry = (entry: TimelineEntry) => {
        if (!userProfile) return;
        
        setUserProfile({
            ...userProfile,
            timeline: [
                ...userProfile.timeline,
                entry
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        });
    };

    const addTestRecord = (record: TestRecord) => {
        if (!userProfile) return;
        
        setUserProfile({
            ...userProfile,
            tests: [...userProfile.tests, record],
            XP: userProfile.XP + (record.score > 70 ? 50 : 20) // Award XP based on score
        });
    };

    const addReport = (report: Report) => {
        if (!userProfile) return;
        
        setUserProfile({
            ...userProfile,
            reports: [...userProfile.reports, report]
        });
    };

    const setTutorHistory = (history: Message[]) => {
        if (!userProfile) return;
        
        setUserProfile({
            ...userProfile,
            tutorHistory: history
        });
    };

    return (
        <AppContext.Provider
            value={{
                userProfile,
                loading,
                setUserProfile,
                addTimelineEntry,
                addTestRecord,
                addReport,
                setTutorHistory
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export default AppProvider;
