
import type { UserProfile } from '../types';

const USER_PROFILE_KEY = 'examito_user_profile';

export const getUserProfile = (): UserProfile | null => {
    const profileJson = localStorage.getItem(USER_PROFILE_KEY);
    return profileJson ? JSON.parse(profileJson) : null;
};

export const saveUserProfile = (profile: UserProfile): void => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
};

export const getInitialUserProfile = (name: string, board: string): UserProfile => ({
    userId: `user-${Date.now()}`,
    name,
    board,
    XP: 0,
    streak: 0,
    lastDailyCompletion: null,
    dailyQuestionsCompleted: 0,
    timeline: [],
    tests: [],
    reports: [],
    tutorHistory: [],
});
