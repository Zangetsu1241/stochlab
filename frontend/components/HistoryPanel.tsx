"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { API_BASE_URL } from '../lib/api';

interface HistoryItem {
    id: number;
    simulation_type: string;
    parameters: string; // JSON string
    timestamp: string;
}

interface HistoryPanelProps {
    simType: string;
    onLoad: (params: any) => void;
}

export default function HistoryPanel({ simType, onLoad }: HistoryPanelProps) {
    const { user, token } = useAuth();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchHistory = async () => {
        if (!user || !token) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/history/${simType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error("Failed to fetch history", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && user) {
            fetchHistory();
        }
    }, [isOpen, user]);

    // Expose a helper to save history (triggered by parent)
    // Actually, parent handles saving. This component just lists.

    if (!user) return null;

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed right-0 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/10 text-zinc-400 p-2 rounded-l-xl border-y border-l border-white/10 transition z-40"
                title="View History"
            >
                ⏳
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="fixed inset-y-0 right-0 w-80 bg-[#09090b]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 p-6 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-xl">📜</span> History
                            <span className="text-xs font-normal text-zinc-500 ml-2">Last 10 Runs</span>
                        </h2>
                        <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                        {loading && <div className="text-center text-zinc-500 text-sm py-4">Loading...</div>}
                        {!loading && history.length === 0 && (
                            <div className="text-center text-zinc-600 text-sm italic py-4">No history found. Run a simulation to save it!</div>
                        )}
                        {history.map((item) => {
                            const params = JSON.parse(item.parameters);
                            return (
                                <div key={item.id} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 transition group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs text-zinc-500 font-mono">{format(new Date(item.timestamp), 'MMM d, HH:mm')}</span>
                                    </div>
                                    <div className="text-xs text-zinc-300 font-mono truncate mb-3">
                                        {Object.entries(params).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ')}...
                                    </div>
                                    <button
                                        onClick={() => { onLoad(params); setIsOpen(false); }}
                                        className="w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg border border-indigo-500/20 transition"
                                    >
                                        Load Parameters
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}

// Helper function to save history
export const saveHistory = async (simType: string, params: any, token: string | null) => {
    if (!token) return;
    try {
        await axios.post(`${API_BASE_URL}/history/`, {
            simulation_type: simType,
            parameters: JSON.stringify(params)
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (err) {
        console.error("Failed to save history", err);
    }
};
