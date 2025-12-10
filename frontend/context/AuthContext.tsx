"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

interface User {
    id: number;
    username: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isGuest: boolean;
    login: (token: string, username: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isGuest: true,
    login: () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Check localStorage on mount
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('username');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser({ id: 0, username: storedUser }); // ID fetch could be separate
        }
    }, []);

    const login = (newToken: string, username: string) => {
        setToken(newToken);
        setUser({ id: 0, username }); // You might want to fetch real ID from /me
        localStorage.setItem('token', newToken);
        localStorage.setItem('username', username);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('username');
    };

    return (
        <AuthContext.Provider value={{ user, token, isGuest: !user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
