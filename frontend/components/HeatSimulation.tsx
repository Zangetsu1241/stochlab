"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { solveHeatEquation, HeatInput } from '../lib/api';
import { PREMIUM_CHART_LAYOUT, PREMIUM_CHART_CONFIG, CHART_COLORS } from '../lib/chartConfig';
import Methodology from './Methodology';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });


import { useAuth } from '../context/AuthContext';
import HistoryPanel, { saveHistory } from './HistoryPanel';

interface HeatSimulationProps {
    isActive: boolean;
}

export default function HeatSimulation({ isActive }: HeatSimulationProps) {
    const { token } = useAuth();
    // --- Parameters ---
    const [params, setParams] = useState<HeatInput>({
        alpha: 0.5,
        dt: 0.0001,
        dx: 0.01,
        t_steps: 200, // Smaller chunks for smoother updates
        domain: 1.0,
        init: "pulse",
        sigma: 0.0,
        snapshot_interval: 10
    });

    // --- State ---
    // Accumulate all frames here
    const [history, setHistory] = useState<number[][]>([]);
    const [energyHistory, setEnergyHistory] = useState<number[]>([]);

    // Playback state
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Simulation state
    const [isSimulating, setIsSimulating] = useState(false); // True if backend loop is active
    const [loadingBatch, setLoadingBatch] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs for animation loop and simulation control
    const animationRef = useRef<number | null>(null);
    const simulationRef = useRef(false); // Ref copy of isSimulating to access in async loop
    const latestHistoryRef = useRef<number[][]>([]); // Ref copy of history for seamless chaining

    // Update refs when state changes
    useEffect(() => {
        simulationRef.current = isSimulating;
    }, [isSimulating]);

    useEffect(() => {
        latestHistoryRef.current = history;
    }, [history]);

    // Handle tab switching: Stop simulation if inactive to save resources, but component stays mounted (preserving state)
    useEffect(() => {
        if (!isActive) {
            setIsSimulating(false);
            setIsPlaying(false);
        }
    }, [isActive]);

    // Cleanup on unmount (only happens if entirely navigating away)
    useEffect(() => {
        return () => {
            simulationRef.current = false;
            if (animationRef.current) clearInterval(animationRef.current);
        };
    }, []);

    // --- Simulation Logic ---

    // Fetch one batch of frames
    const fetchBatch = async (startState?: number[]) => {
        setLoadingBatch(true);
        try {
            const input: HeatInput = { ...params };

            // Ensure chunk size (t_steps) is large enough to produce at least a few frames
            // otherwise slice(1) might result in empty array if snapshot_interval is large
            const minSteps = input.snapshot_interval * 10;
            if (input.t_steps < minSteps) {
                input.t_steps = minSteps;
            }

            if (startState) {
                input.current_state = startState;
            }

            const data = await solveHeatEquation(input);
            return data; // Return full object { frames, energy }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Simulation failed");
            setIsSimulating(false);
            return null;
        } finally {
            setLoadingBatch(false);
        }
    };

    // Main simulation loop
    const startSimulation = useCallback(async () => {
        setError(null);
        setIsSimulating(true);
        simulationRef.current = true;

        // Always start fresh history on new "Start"
        setHistory([]);
        setEnergyHistory([]);
        latestHistoryRef.current = [];
        setCurrentFrameIndex(0);

        // 1. Initial Batch
        const firstBatch = await fetchBatch();
        if (!firstBatch || firstBatch.frames.length === 0) {
            console.error("First batch failed or empty", firstBatch);
            return;
        }

        // Save History
        if (token) {
            saveHistory('heat', params, token);
        }

        setHistory(firstBatch.frames);
        setEnergyHistory(firstBatch.energy);
        latestHistoryRef.current = firstBatch.frames;

        // Start playback immediately
        setIsPlaying(true);

        // 2. Loop for subsequent batches
        while (simulationRef.current) {
            // Get last frame of current history to use as seed
            const currentHist = latestHistoryRef.current;
            const lastFrame = currentHist[currentHist.length - 1];

            const nextBatch = await fetchBatch(lastFrame);
            if (!nextBatch || nextBatch.frames.length === 0) break;

            // Remove the first frame of next batch if it duplicates the last frame of prev batch?
            // solve_heat usually includes t=0. If we pass u_final as init, t=0 is u_final.
            // So yes, remove index 0 to avoid duplicate frames.
            const uniqueNextFrames = nextBatch.frames.slice(1);
            const uniqueNextEnergy = nextBatch.energy.slice(1);

            setHistory(prev => [...prev, ...uniqueNextFrames]);
            setEnergyHistory(prev => [...prev, ...uniqueNextEnergy]);

            // Small pause to yield to UI thread if needed, or rely on await
            await new Promise(r => setTimeout(r, 50));
        }
    }, [params, token]);

    const handleHistoryLoad = (loadedParams: any) => {
        setParams(prev => ({
            ...prev,
            ...loadedParams
        }));
    };

    const stopSimulation = () => {
        setIsSimulating(false);
        setIsPlaying(false);
    };

    // --- Animation Loop ---
    useEffect(() => {
        if (isPlaying && history.length > 0) {
            animationRef.current = window.setInterval(() => {
                setCurrentFrameIndex(prev => {
                    // If we are at the end...
                    if (prev >= history.length - 1) {
                        // If simulation is still running, we might get more frames soon.
                        // Just stay at end.
                        // If simulation stopped, stop playing.
                        if (!simulationRef.current) {
                            setIsPlaying(false);
                        }
                        return prev;
                    }
                    return prev + 1;
                });
            }, 50); // 20 FPS
        } else {
            if (animationRef.current) clearInterval(animationRef.current);
        }

        return () => {
            if (animationRef.current) clearInterval(animationRef.current);
        };
    }, [isPlaying, history.length]); // Depend on history length so loop knows if new frames arrived

    // --- Controls ---
    const handleReset = () => {
        setIsSimulating(false);
        setIsPlaying(false);
        setHistory([]);
        setEnergyHistory([]);
        setCurrentFrameIndex(0);
        setError(null);
    };

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: name === "init" ? value : parseFloat(value)
        }));
    };

    const stepFrame = (delta: number) => {
        setCurrentFrameIndex(prev => {
            const next = prev + delta;
            return Math.max(0, Math.min(next, history.length - 1));
        });
        setIsPlaying(false); // Stop auto-play when manually stepping
    };

    // Grid for X-axis
    const nx = Math.floor(params.domain / params.dx) + 1;
    const xArray = Array.from({ length: nx }, (_, i) => i * params.dx);

    return (
        <div className="flex h-full w-full bg-transparent text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-black/60 backdrop-blur-lg p-6 flex flex-col gap-6 overflow-y-auto border-r border-white/10 shadow-2xl z-10 shrink-0 custom-scrollbar">

                {/* Simulation Control */}
                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Simulation Control</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {!isSimulating ? (
                            <button onClick={startSimulation} className="col-span-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all transform active:scale-95">
                                Start Infinite
                            </button>
                        ) : (
                            <button onClick={stopSimulation} className="col-span-2 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-rose-900/20 transition-all animate-pulse">
                                Stop Generating
                            </button>
                        )}
                        <button onClick={handleReset} className="col-span-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition text-zinc-400 hover:text-white border border-white/5">
                            Reset State
                        </button>
                    </div>
                </div>

                {/* Parameters */}
                <div className="space-y-6 border-t border-white/10 pt-6">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Physics Parameters</h2>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Domain Len</label>
                                <input
                                    type="number" step="0.1" name="domain" value={params.domain} onChange={handleParamChange}
                                    disabled={history.length > 0}
                                    className={`w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none transition ${history.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Grid (dx)</label>
                                <input
                                    type="number" step="0.001" name="dx" value={params.dx} onChange={handleParamChange}
                                    disabled={history.length > 0}
                                    className={`w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none transition ${history.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Diffusivity (α)</label>
                                <input type="number" step="0.01" name="alpha" value={params.alpha} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Time Step (dt)</label>
                                <input
                                    type="number" step="0.0001" name="dt" value={params.dt} onChange={handleParamChange}
                                    className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Stochastic Noise (σ)</label>
                            <input type="number" step="0.1" name="sigma" value={params.sigma} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none transition" />
                        </div>

                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Snapshot Interval</label>
                            <input
                                type="number" step="1" min="1" name="snapshot_interval" value={params.snapshot_interval} onChange={handleParamChange}
                                className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Initial Condition</label>
                            <select
                                name="init" value={params.init} onChange={handleParamChange}
                                disabled={history.length > 0}
                                className={`w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-teal-500/50 ${history.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <option value="pulse" className="bg-gray-900">Gaussian Pulse</option>
                                <option value="sin" className="bg-gray-900">Sine Wave</option>
                                <option value="random" className="bg-gray-900">Random Noise</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-6 border-t border-white/10">
                    <div className="flex justify-between text-xs text-zinc-500 font-mono">
                        <span>Frames: <span className="text-white">{history.length}</span></span>
                        <span>State: <span className={isSimulating ? "text-emerald-400" : "text-zinc-400"}>{isSimulating ? "Running" : "Idle"}</span></span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative bg-transparent">
                {/* Top Bar - Playback Controls */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-20">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-medium text-white tracking-tight flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                            Real-Time Visualization
                        </h2>
                        <span className="text-xs text-zinc-500 font-mono ml-4">t = {(currentFrameIndex * params.dt * params.snapshot_interval).toFixed(4)}</span>
                    </div>

                    <div className="flex items-center gap-4 bg-black/40 p-1.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-sm">
                        <button onClick={() => stepFrame(-1)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition" title="Step Back">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>

                        <button
                            onClick={() => {
                                if (isPlaying) {
                                    setIsPlaying(false);
                                    setIsSimulating(false);
                                } else {
                                    setIsPlaying(true);
                                }
                            }}
                            className={`w-32 py-1.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 border ${isPlaying
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                                : "bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20"
                                }`}
                        >
                            {isPlaying ? "PAUSE" : "PLAY"}
                        </button>

                        <button onClick={() => stepFrame(1)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition" title="Step Forward">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <div className="w-64 flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                            <span>History Start</span>
                            <span>Live</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={Math.max(0, history.length - 1)}
                            value={currentFrameIndex}
                            onChange={(e) => {
                                setCurrentFrameIndex(parseInt(e.target.value));
                                setIsPlaying(false);
                            }}
                            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400"
                        />
                    </div>
                </div>

                {/* Plot Area */}
                <div className="flex-1 p-6 relative overflow-hidden gap-6 overflow-y-auto custom-scrollbar min-h-0">
                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                    {history.length > 0 && currentFrameIndex < history.length ? (
                        <>
                            {/* Main Heatmap */}
                            <div className="bg-black/40 rounded-3xl shadow-2xl border border-white/5 p-1 backdrop-blur-md relative overflow-hidden group min-h-[500px] shrink-0">
                                <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">Temperature Profile u(x,t)</div>
                                <Plot
                                    data={[
                                        {
                                            x: xArray,
                                            y: history[currentFrameIndex],
                                            type: 'scatter',
                                            mode: 'lines',
                                            marker: { color: params.sigma > 0 ? CHART_COLORS.primary : CHART_COLORS.secondary },
                                            line: { width: 3, shape: 'spline' },
                                            name: 'Temperature',
                                            fill: 'tozeroy',
                                            fillcolor: params.sigma > 0 ? 'rgba(45, 212, 191, 0.1)' : 'rgba(59, 130, 246, 0.1)'
                                        }
                                    ]}
                                    layout={{
                                        ...PREMIUM_CHART_LAYOUT,
                                        title: { text: '' },
                                        xaxis: { ...PREMIUM_CHART_LAYOUT.xaxis, showgrid: true, range: [0, params.domain] },
                                        yaxis: { ...PREMIUM_CHART_LAYOUT.yaxis, range: [-1.5, 1.5] },
                                        margin: { t: 40, r: 20, l: 40, b: 30 },
                                    }}
                                    config={PREMIUM_CHART_CONFIG}
                                    useResizeHandler={true}
                                    style={{ width: "100%", height: "100%" }}
                                />
                            </div>

                            {/* Energy Plot */}
                            <div className="h-1/3 bg-black/40 rounded-3xl shadow-xl border border-white/5 p-1 backdrop-blur-md relative overflow-hidden">
                                <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">System Energy (L2 Norm)</div>
                                <Plot
                                    data={[
                                        {
                                            y: energyHistory.slice(0, currentFrameIndex + 1),
                                            type: 'scatter',
                                            mode: 'lines',
                                            marker: { color: CHART_COLORS.accent },
                                            line: { width: 2 },
                                            name: 'Energy',
                                            fill: 'tozeroy',
                                            fillcolor: 'rgba(251, 191, 36, 0.05)'
                                        },
                                        {
                                            x: [currentFrameIndex],
                                            y: [energyHistory[currentFrameIndex]],
                                            type: 'scatter',
                                            mode: 'markers',
                                            marker: { color: 'white', size: 6, line: { width: 2, color: CHART_COLORS.accent } },
                                            showlegend: false,
                                            hoverinfo: 'skip'
                                        }
                                    ]}
                                    layout={{
                                        ...PREMIUM_CHART_LAYOUT,
                                        title: { text: "" },
                                        xaxis: { ...PREMIUM_CHART_LAYOUT.xaxis, showgrid: false },
                                        yaxis: { ...PREMIUM_CHART_LAYOUT.yaxis },
                                        margin: { t: 40, r: 20, l: 40, b: 30 },
                                    }}
                                    config={PREMIUM_CHART_CONFIG}
                                    useResizeHandler={true}
                                    style={{ width: "100%", height: "100%" }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 animate-in fade-in duration-700 min-h-[500px] shrink-0">
                            <div className="relative mb-8 group cursor-pointer" onClick={startSimulation}>
                                <div className="absolute inset-0 bg-teal-500 blur-2xl opacity-20 group-hover:opacity-40 transition duration-500 rounded-full"></div>
                                <div className="relative w-32 h-32 rounded-full border border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition duration-500">
                                    <span className="text-5xl text-zinc-500 group-hover:text-teal-400 transition duration-500">∞</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-zinc-300">Ready to Visualize</h3>
                            <p className="mt-3 text-sm text-zinc-500 max-w-sm text-center leading-relaxed">
                                Initialize the infinite simulation engine to begin streaming stochastic PDE solutions.
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
                    <Methodology
                        title="1D Stochastic Heat Equation"
                        description="Models thermal diffusion in a rod subject to random environmental fluctuations. This is a fundamental Stochastic Partial Differential Equation (SPDE) describing how heat (or information) spreads over time under uncertainty."
                        formula={[
                            "∂u/∂t = α · ∂²u/∂x² + σ · ξ(x,t)",
                            "u(x,t): Temperature at position x and time t",
                            "α (Alpha): Thermal Diffusivity",
                            "ξ(x,t): Spatiotemporal Gaussian White Noise"
                        ]}
                        params={[
                            { label: "Diffusivity (α)", desc: "Controls the speed of heat propagation. Higher α means faster equilibration.", icon: "α" },
                            { label: "Noise (σ)", desc: "Intensity of random path fluctuations. Simulates external disturbances.", icon: "σ" },
                            { label: "Domain Length", desc: "Physical length of the rod. Larger domains require more grid points (dx).", icon: "L" }
                        ]}
                        details={[
                            { label: "Numerical Scheme", value: "FTCS (Forward-Time Central-Space)" },
                            { label: "Stability Limit", value: "r = αΔt/Δx² ≤ 0.5" },
                            { label: "Boundary Condition", value: "Dirichlet (Fixed Ends)" },
                            { label: "Time Integration", value: "Euler-Maruyama" }
                        ]}
                    />
                </div>
            </div>

            <HistoryPanel simType="heat" onLoad={handleHistoryLoad} />
        </div>
    );
}
