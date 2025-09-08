import React, { useState, ReactNode } from 'react';
import { AppContext } from './AppContext';
import type { UserProfile, TimelineEntry, TestRecord, Report, Message } from '../types';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
