import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logout as authLogout } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(getCurrentUser());

    const login = (userData) => {
        setUser(userData);
    };

    const logout = () => {
        authLogout();
        setUser(null);
    };

    // Keep state in sync with localStorage if changed elsewhere (optional but good)
    useEffect(() => {
        const handleStorageChange = () => {
            setUser(getCurrentUser());
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
