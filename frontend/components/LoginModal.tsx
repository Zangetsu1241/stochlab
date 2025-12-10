"use client";

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { login } = useAuth();
    const [isLoginView, setIsLoginView] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        console.log("Starting auth process...");

        const config = {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 5000 // 5s timeout
        };

        try {
            if (isLoginView) {
                console.log("Attempting login...");
                const params = new URLSearchParams();
                params.append('username', username);
                params.append('password', password);

                const res = await axios.post('http://127.0.0.1:8000/api/v1/auth/token', params, config);
                console.log("Login success:", res.data);
                login(res.data.access_token, username);
                onClose();
            } else {
                console.log("Attempting registration...");
                // Register
                await axios.post('http://127.0.0.1:8000/api/v1/auth/register', { username, password }, { timeout: 5000 });
                console.log("Registration success. Attempting auto-login...");

                // Auto login
                const params = new URLSearchParams();
                params.append('username', username);
                params.append('password', password);

                const res = await axios.post('http://127.0.0.1:8000/api/v1/auth/token', params, config);
                console.log("Auto-login success:", res.data);
                login(res.data.access_token, username);
                onClose();
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            let msg = "Authentication failed.";
            if (err.code === 'ECONNABORTED') msg = "Request timed out. Backend may be slow.";
            else if (err.response?.data?.detail) msg = err.response.data.detail;
            else if (err.message) msg = err.message;

            setError(msg);
        } finally {
            console.log("Auth process finished. Resetting loading state.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#09090b] w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition">✕</button>

                <h2 className="text-2xl font-bold text-white mb-2">{isLoginView ? "Welcome Back" : "Create Account"}</h2>
                <p className="text-zinc-400 text-sm mb-6">
                    {isLoginView ? "Sign in to save your simulation history." : "Register to track your experiments."}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 uppercase mb-1.5">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 uppercase mb-1.5">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Processing..." : (isLoginView ? "Sign In" : "Sign Up")}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-zinc-500">
                    {isLoginView ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLoginView(!isLoginView)}
                        className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
                    >
                        {isLoginView ? "Sign up" : "Log in"}
                    </button>
                </div>
            </div>
        </div>
    );
}
