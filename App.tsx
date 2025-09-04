
import React, { useState, useMemo } from 'react';
import { AppContext } from './contexts/AppContext';
import useUserProfile from './hooks/useUserProfile';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AdaptiveTutor from './components/AdaptiveTutor';
import TestGenerator from './components/TestGenerator';
import ProgressReports from './components/ProgressReports';
import Timeline from './components/Timeline';
import Login from './components/Login';
import { View } from './types';
import type { UserProfile, Message } from './types';
import { Toaster, toast } from 'react-hot-toast';

const App: React.FC = () => {
    const { userProfile, setUserProfile, loading } = useUserProfile();
    const [activeView, setActiveView] = useState<View>(View.DASHBOARD);

    const contextValue = useMemo(() => ({
        userProfile,
        setUserProfile: (profile: UserProfile | null) => {
            const isNewUser = userProfile === null && profile !== null;
            setUserProfile(profile);
            if (isNewUser) {
                toast.success('Welcome! Your profile has been created.');
            }
        },
        addTimelineEntry: (entry) => {
            if (userProfile) {
                const updatedProfile = {
                    ...userProfile,
                    timeline: [...userProfile.timeline, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
                };
                setUserProfile(updatedProfile);
                toast.success('Timeline entry added!');
            }
        },
        addTestRecord: (record) => {
            if (userProfile) {
                const updatedProfile = {
                    ...userProfile,
                    tests: [...userProfile.tests, record],
                };
                setUserProfile(updatedProfile);
            }
        },
        addReport: (report) => {
             if (userProfile) {
                const updatedProfile = {
                    ...userProfile,
                    reports: [report, ...userProfile.reports],
                };
                setUserProfile(updatedProfile);
            }
        },
        setTutorHistory: (history: Message[]) => {
            if (userProfile) {
                setUserProfile({ ...userProfile, tutorHistory: history });
            }
        }
    }), [userProfile, setUserProfile]);

    const renderView = () => {
        switch (activeView) {
            case View.DASHBOARD:
                return <Dashboard setActiveView={setActiveView} />;
            case View.TUTOR:
                return <AdaptiveTutor />;
            case View.TESTS:
                return <TestGenerator />;
            case View.REPORTS:
                return <ProgressReports />;
            case View.TIMELINE:
                return <Timeline />;
            default:
                return <Dashboard setActiveView={setActiveView} />;
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">Loading Examito...</div>
            </div>
        );
    }

    return (
        <AppContext.Provider value={contextValue}>
            <Toaster position="top-right" reverseOrder={false} />
            {!userProfile ? (
                <Login />
            ) : (
                <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                    <Sidebar activeView={activeView} setActiveView={setActiveView} />
                    <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                        {renderView()}
                    </main>
                </div>
            )}
        </AppContext.Provider>
    );
};

export default App;
