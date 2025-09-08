
import React, { useState, useEffect } from 'react';
import { AppProvider } from './contexts/AppProvider';
import useUserProfile from './hooks/useUserProfile';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AdaptiveTutor from './components/AdaptiveTutor';
import TestGenerator from './components/TestGenerator';
import ProgressReports from './components/ProgressReports';
import Timeline from './components/Timeline';
import Login from './components/Login';
import { View } from './types';
import { Toaster, toast } from 'react-hot-toast';

const AppContent: React.FC = () => {
    const { userProfile, loading } = useUserProfile();
    const [activeView, setActiveView] = useState<View>(View.DASHBOARD);

    useEffect(() => {
        if (userProfile) {
            toast.success('Welcome back!');
        }
    }, [userProfile]);

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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex">
            {userProfile ? (
                <>
                    <Sidebar activeView={activeView} setActiveView={setActiveView} />
                    <main className="flex-1 p-6 overflow-y-auto">
                        {renderView()}
                    </main>
                </>
            ) : (
                <Login />
            )}
            <Toaster position="bottom-right" />
        </div>
    );
};

const App: React.FC = () => (
    <AppProvider>
        <AppContent />
    </AppProvider>
);

export default App;
