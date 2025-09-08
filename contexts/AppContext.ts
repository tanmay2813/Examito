
import { createContext } from 'react';
import type { AppContextType } from '../types';

export const AppContext = createContext<AppContextType>({
    userProfile: null,
    loading: true,
    setUserProfile: () => {},
    addTimelineEntry: () => {},
    addTestRecord: () => {},
    addReport: () => {},
    setTutorHistory: () => {},
});
