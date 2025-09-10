
import { useState, useEffect, useCallback } from 'react';
import { getUserProfile, saveUserProfile } from '../services/localStorageService';
import type { UserProfile } from '../types';

const useUserProfile = () => {
    const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const profile = getUserProfile();
            setUserProfileState(profile);
        } catch (error) {
            console.error("Failed to load user profile from local storage:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const setUserProfile = useCallback((profile: UserProfile | null) => {
        try {
            setUserProfileState(profile);
            if (profile) {
                saveUserProfile(profile);
            } else {
                localStorage.removeItem('examito_user_profile');
            }
        } catch (error) {
            console.error("Failed to save user profile to local storage:", error);
        }
    }, []);

    return { userProfile, setUserProfile, loading };
};

export default useUserProfile;
   