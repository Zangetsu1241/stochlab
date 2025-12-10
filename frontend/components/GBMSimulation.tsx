"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { solveGBM, GBMInput } from '../lib/api';
import { PREMIUM_CHART_LAYOUT, PREMIUM_CHART_CONFIG, CHART_COLORS } from '../lib/chartConfig';
import Methodology from './Methodology';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

import { useAuth } from '../context/AuthContext';
import HistoryPanel, { saveHistory } from './HistoryPanel';

interface GBMSimulationProps {
    isActive: boolean;
}

// Predefined palette for path visualization
const PATH_COLORS = [
    '#f472b6', '#c084fc', '#818cf8', '#60a5fa', '#34d399',
    '#facc15', '#fb923c', '#f87171', '#9ca3af', '#e879f9'
];

export default function GBMSimulation({ isActive }: GBMSimulationProps) {
    // --- Parameters ---
    const [params, setParams] = useState<GBMInput>({
        S0: 100,
        mu: 0.05,
        sigma: 0.2,
        T: 1.0,
        dt: 0.01,
        n_paths: 10
    });

    // --- State ---
    const [data, setData] = useState<{ time: number[], paths: number[][] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { token } = useAuth();

    // --- Logic ---
    const runSimulation = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await solveGBM(params);
            setData(result);
            // Save to history
            if (token) {
                saveHistory('gbm', params, token);
            }
        } catch (err: any) {
            console.error(err);
            setError("Simulation failed. Check console.");
        } finally {
            setLoading(false);
        }
    };

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: parseFloat(value)
        }));
    };

    const handleHistoryLoad = (loadedParams: any) => {
        setParams(prev => ({
            ...prev,
            ...loadedParams
        }));
    };

    // Prepare plot data
    const plotData = data ? data.paths.map((path, i) => {
        const color = PATH_COLORS[i % PATH_COLORS.length];
        return {
            x: data.time,
            y: path,
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: `Path ${i + 1}`,
            line: { width: 1.5, opacity: 0.6, color: color },
            showlegend: false
        };
    }) : [];

    // Add average line if data exists
    if (data && plotData.length > 0) {
        const avgPath = data.paths[0].map((_, colIndex) => {
            const sum = data.paths.reduce((acc, path) => acc + path[colIndex], 0);
            return sum / data.paths.length;
        });
        plotData.push({
            x: data.time,
            y: avgPath,
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: 'Average',
            line: { width: 3, color: 'white', opacity: 1 },
            showlegend: false
        });
    }

    // Helper to format currency
    const fmt = (n: number) => n.toFixed(2);

    return (
        <div className="flex h-full w-full bg-transparent text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-black/60 backdrop-blur-lg p-6 flex flex-col gap-6 border-r border-white/10 shadow-2xl z-10 shrink-0 overflow-y-auto custom-scrollbar">

                {/* Simulation Control */}
                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Simulation Control</h2>
                    <button
                        onClick={runSimulation}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${loading
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-900/20'}`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Calculation in Progress...
                            </span>
                        ) : "Run Monte Carlo"}
                    </button>
                </div>

                {/* Parameters */}
                <div className="space-y-6 border-t border-white/10 pt-6">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Model Parameters</h2>
                    <div className="space-y-4 text-sm">
                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Initial Price (S0)</label>
                            <input type="number" name="S0" value={params.S0} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Drift (μ)</label>
                                <input type="number" step="0.01" name="mu" value={params.mu} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Vol (σ)</label>
                                <input type="number" step="0.01" name="sigma" value={params.sigma} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Time (T)</label>
                                <input type="number" step="0.5" name="T" value={params.T} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Step (dt)</label>
                                <input type="number" step="0.001" name="dt" value={params.dt} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Paths (N)</label>
                            <input type="number" step="1" max="50" name="n_paths" value={params.n_paths} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition" />
                        </div>
                    </div>
                </div>

                {/* Path Results Legend */}
                {data && (
                    <div className="mt-auto space-y-2 border-t border-white/10 pt-6 max-h-64 overflow-y-auto pr-1">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Simulation Results</h2>
                            <span className="text-[10px] text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full">{data.paths.length} Paths</span>
                        </div>

                        <div className="space-y-1.5">
                            {data.paths.map((path, i) => {
                                const finalPrice = path[path.length - 1];
                                const color = PATH_COLORS[i % PATH_COLORS.length];
                                const isProfit = finalPrice > params.S0;
                                return (
                                    <div key={i} className="flex items-center justify-between text-xs group hover:bg-white/5 p-1.5 rounded-lg transition border border-transparent hover:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-white/10" style={{ backgroundColor: color }}></div>
                                            <span className="text-zinc-400 font-mono group-hover:text-zinc-200 transition">Path {i + 1}</span>
                                        </div>
                                        <span className={`font-mono font-medium ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            ${fmt(finalPrice)}
                                        </span>
                                    </div>
                                );
                            })}
                            <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-white/10 font-bold">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm ring-1 ring-white/20"></div>
                                    <span className="text-white">Average</span>
                                </div>
                                <span className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">
                                    ${fmt(data.paths.reduce((s, p) => s + p[p.length - 1], 0) / data.paths.length)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 relative bg-transparent p-6 overflow-y-auto custom-scrollbar min-h-0">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                <div className="min-h-[500px] shrink-0 bg-black/40 rounded-3xl shadow-2xl border border-white/5 p-1 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">Asset Price Evolution S(t)</div>
                    {data ? (
                        <Plot
                            data={plotData}
                            layout={{
                                ...PREMIUM_CHART_LAYOUT,
                                title: { text: '' },
                                xaxis: { ...PREMIUM_CHART_LAYOUT.xaxis, showgrid: true, zeroline: false },
                                yaxis: { ...PREMIUM_CHART_LAYOUT.yaxis, showgrid: true, zeroline: false },
                                margin: { t: 40, r: 20, l: 40, b: 30 },
                            }}
                            config={PREMIUM_CHART_CONFIG}
                            useResizeHandler={true}
                            style={{ width: "100%", height: "100%" }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 animate-in fade-in duration-700">
                            <div className="relative mb-8 group cursor-pointer" onClick={runSimulation}>
                                <div className="absolute inset-0 bg-violet-600 blur-3xl opacity-10 group-hover:opacity-20 transition duration-500 rounded-full"></div>
                                <div className="relative w-24 h-24 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition duration-500 rotate-3 group-hover:rotate-6">
                                    <span className="text-4xl text-zinc-500 group-hover:text-violet-400 transition duration-500">📈</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-zinc-300">Monte Carlo Simulation</h3>
                            <p className="mt-3 text-sm text-zinc-500 max-w-sm text-center leading-relaxed">
                                Initialize the stochastic engine to generate random geometric brownian motion paths.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute bottom-10 right-10 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h4 className="font-bold text-sm uppercase mb-0.5">Simulation Error</h4>
                                <p className="text-sm opacity-90">{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="ml-4 hover:bg-red-500/20 rounded-lg p-1 transition">✕</button>
                        </div>
                    )}
                </div>

                <Methodology
                    title="Geometric Brownian Motion (GBM)"
                    description="A continuous-time stochastic process where the logarithm of the randomly varying quantity follows a Brownian motion with drift. It is the standard model for stock prices in the Black-Scholes framework."
                    formula={[
                        "dSₜ = μSₜdt + σSₜdWₜ",
                        "Sₜ: Asset Price at time t",
                        "μ (Mu): Drift (Expected Return)",
                        "σ (Sigma): Volatility",
                        "Wₜ: Wiener Process (Brownian Motion)"
                    ]}
                    params={[
                        { label: "Drift (μ)", desc: "The expected annualized return of the asset.", icon: "μ" },
                        { label: "Volatility (σ)", desc: "Standard deviation of returns (risk measure).", icon: "σ" },
                        { label: "Time Horizon (T)", desc: "Duration of the simulation in years.", icon: "T" }
                    ]}
                    details={[
                        { label: "SDE Type", value: "Log-Normal Process" },
                        { label: "Solution Method", value: "Exact Geometric Integration" },
                        { label: "Discretization", value: "Euler-Maruyama" },
                        { label: "Randomness", value: "Box-Muller Transform" }
                    ]}
                />
            </div>

            <HistoryPanel simType="gbm" onLoad={handleHistoryLoad} />
        </div>
    );
}
