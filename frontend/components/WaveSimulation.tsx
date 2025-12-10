"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { solveWave, WaveInput } from '../lib/api';
import { PREMIUM_CHART_LAYOUT, PREMIUM_CHART_CONFIG, CHART_COLORS } from '../lib/chartConfig';
import Methodology from './Methodology';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });


interface WaveSimulationProps {
    isActive: boolean;
}

export default function WaveSimulation({ isActive }: WaveSimulationProps) {

    // --- Parameters ---
    const [params, setParams] = useState<WaveInput>({
        c: 1.0,
        damping: 0.05,
        sigma: 0.5,
        T: 5.0, // Short chunk for fast updates
        dt: 0.05,
        dx: 0.1,
        domain_len: 10.0,
        init_type: "pulse"
    });

    // --- State ---
    const [history, setHistory] = useState<number[][]>([]);  // Accumulate frames
    const [energyHistory, setEnergyHistory] = useState<number[]>([]);
    const [xArray, setXArray] = useState<number[]>([]);

    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const animationRef = useRef<number | null>(null);
    const simulationRef = useRef(false);
    const latestHistoryRef = useRef<number[][]>([]); // To get last frame for resume

    // Track u_prev implicitly? Or ask backend to return it?
    // Backend returns frames. frame[-1] is u_curr. frame[-2] is u_prev.
    // So we can extract it from history.

    useEffect(() => {
        simulationRef.current = isSimulating;
    }, [isSimulating]);

    useEffect(() => {
        latestHistoryRef.current = history;
    }, [history]);

    // Cleanup
    useEffect(() => {
        return () => {
            simulationRef.current = false;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    // Tab switch handling
    useEffect(() => {
        if (!isActive) {
            setIsPlaying(false);
            setIsSimulating(false);
        }
    }, [isActive]);


    // --- Logic ---
    const fetchBatch = async (startU?: number[], startUPrev?: number[]) => {
        try {
            const input: WaveInput = { ...params };
            if (startU) input.current_u = startU;
            if (startUPrev) input.current_u_prev = startUPrev;

            // Validate T / dt isn't too huge
            if (input.T > 20) input.T = 20; // Cap chunk size

            const res = await solveWave(input);
            return res;
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Simulation failed");
            setIsSimulating(false);
            return null;
        }
    };

    const startSimulation = useCallback(async () => {
        setError(null);
        setIsSimulating(true);
        simulationRef.current = true;

        // Reset
        setHistory([]);
        setEnergyHistory([]);
        latestHistoryRef.current = [];
        setCurrentFrameIndex(0);

        // 1. Initial Batch
        const firstBatch = await fetchBatch();
        if (!firstBatch || firstBatch.frames.length === 0) return;


        setXArray(firstBatch.x);
        setHistory(firstBatch.frames);
        setEnergyHistory(firstBatch.energy);
        latestHistoryRef.current = firstBatch.frames;

        setIsPlaying(true);

        // 2. Loop
        while (simulationRef.current) {
            const currentHist = latestHistoryRef.current;
            if (currentHist.length < 2) break; // Need at least 2 frames for u, u_prev

            const lastU = currentHist[currentHist.length - 1];
            const lastUPrev = currentHist[currentHist.length - 2];

            const nextBatch = await fetchBatch(lastU, lastUPrev);
            if (!simulationRef.current) break; // Check if stopped while fetching
            if (!nextBatch || nextBatch.frames.length === 0) break;

            // First frame of next batch is result of stepping forward from lastU.
            // So simply append all frames.
            const newFrames = nextBatch.frames;
            const newEnergy = nextBatch.energy;

            setHistory(prev => [...prev, ...newFrames]);
            setEnergyHistory(prev => [...prev, ...newEnergy]);

            // Wait a bit to not spam API
            await new Promise(r => setTimeout(r, 50));
        }

    }, [params]);

    const handleReset = () => {
        simulationRef.current = false; // Stop immediately
        setHistory([]);
        setEnergyHistory([]);
        setCurrentFrameIndex(0);
        setIsPlaying(false);
        setIsSimulating(false);
        setError(null);
    };

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: name === "init_type" ? value : parseFloat(value)
        }));
    };

    // --- Animation Loop ---
    const stepFrame = useCallback((direction: number) => {
        setCurrentFrameIndex(prev => {
            const next = prev + direction;
            return Math.max(0, Math.min(next, history.length - 1));
        });
    }, [history.length]);

    useEffect(() => {
        if (isPlaying && history.length > 0) {
            const animate = () => {
                setCurrentFrameIndex(prev => {
                    // Try to catch up if behind?
                    // Just 1 frame per tick
                    if (prev >= history.length - 1) {
                        // End of buffer
                        if (!simulationRef.current) setIsPlaying(false); // Stop if sim stopped
                        return prev;
                    }
                    return prev + 1;
                });
                animationRef.current = requestAnimationFrame(animate);
            };
            animationRef.current = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationRef.current!);
        }
    }, [isPlaying, history.length]);


    return (
        <div className="flex h-full w-full bg-transparent text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-black/60 backdrop-blur-lg p-6 flex flex-col gap-6 overflow-y-auto border-r border-white/10 shadow-2xl z-10 shrink-0 custom-scrollbar">

                {/* Simulation Control */}
                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Wave Control</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={startSimulation}
                            disabled={isSimulating}
                            className={`col-span-2 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${isSimulating
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/20'
                                }`}
                        >
                            {isSimulating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                                    Simulating...
                                </span>
                            ) : "Start Infinite Wave"}
                        </button>
                        <button onClick={handleReset} className="col-span-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition text-zinc-400 hover:text-white border border-white/5">
                            Stop & Reset
                        </button>
                    </div>
                </div>

                {/* Parameters */}
                <div className="space-y-6 border-t border-white/10 pt-6">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">String Properties</h2>
                    <div className="space-y-4 text-sm">
                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Wave Speed (c)</label>
                            <input type="number" step="0.1" name="c" value={params.c} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Damping</label>
                                <input type="number" step="0.01" name="damping" value={params.damping} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Noise (σ)</label>
                                <input type="number" step="0.1" name="sigma" value={params.sigma} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Chunk (T)</label>
                                <input type="number" step="1" name="T" value={params.T} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">dt</label>
                                <input type="number" step="0.01" name="dt" value={params.dt} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Initial Condition</label>
                            <select
                                name="init_type" value={params.init_type} onChange={handleParamChange}
                                className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-indigo-500/50"
                            >
                                <option value="pulse" className="bg-gray-900">Gaussian Pulse</option>
                                <option value="string" className="bg-gray-900">Plucked String</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-6 border-t border-white/10">
                    <div className="flex justify-between text-xs text-zinc-500 font-mono">
                        <span>Frames: <span className="text-white">{history.length}</span></span>
                        <span>Buffering: <span className={isSimulating ? "text-indigo-400" : "text-zinc-600"}>{isSimulating ? "ON" : "OFF"}</span></span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative bg-transparent">
                {/* Top Bar - Playback Controls */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-20">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-medium text-white tracking-tight flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isSimulating ? "bg-indigo-500 animate-pulse" : "bg-zinc-600"}`}></div>
                            Stochastic Wave Visualization
                        </h2>
                        <span className="text-xs text-zinc-500 font-mono ml-4">t = {(currentFrameIndex * params.dt).toFixed(3)}</span>
                    </div>

                    <div className="flex items-center gap-4 bg-black/40 p-1.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-sm">
                        <button onClick={() => stepFrame(-1)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition" title="Step Back">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`w-32 py-1.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 border ${isPlaying
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
                                }`}
                        >
                            {isPlaying ? "PAUSE" : "PLAY"}
                        </button>
                        <button onClick={() => stepFrame(1)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition" title="Step Forward">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <div className="w-64 flex flex-col gap-1">
                        <input
                            type="range"
                            min="0"
                            max={Math.max(0, history.length - 1)}
                            value={currentFrameIndex}
                            onChange={(e) => {
                                setCurrentFrameIndex(parseInt(e.target.value));
                                setIsPlaying(false);
                            }}
                            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                        />
                    </div>
                </div>

                {/* Plot Area */}
                <div className="flex-1 p-6 relative overflow-y-auto custom-scrollbar gap-6 min-h-0">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                    {history.length > 0 ? (
                        <>
                            {/* Wave Plot */}
                            <div className="bg-black/40 rounded-3xl shadow-2xl border border-white/5 p-1 backdrop-blur-md relative overflow-hidden group min-h-[500px] shrink-0">
                                <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">Displacement u(x,t)</div>
                                <Plot
                                    data={[
                                        {
                                            x: xArray,
                                            y: history[currentFrameIndex],
                                            type: 'scatter',
                                            mode: 'lines',
                                            line: { width: 3, color: CHART_COLORS.secondary, shape: 'spline' },
                                            name: 'Wave',
                                            fill: 'tozeroy',
                                            fillcolor: 'rgba(59, 130, 246, 0.1)'
                                        }
                                    ]}
                                    layout={{
                                        ...PREMIUM_CHART_LAYOUT,
                                        title: { text: '' },
                                        xaxis: { ...PREMIUM_CHART_LAYOUT.xaxis, showgrid: true, range: [0, params.domain_len] },
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
                                <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">Total Energy (Hamiltonian)</div>
                                <Plot
                                    data={[
                                        {
                                            y: energyHistory,
                                            type: 'scatter',
                                            mode: 'lines',
                                            marker: { color: CHART_COLORS.danger },
                                            line: { width: 2 },
                                            name: 'Energy',
                                            fill: 'tozeroy',
                                            fillcolor: 'rgba(244, 63, 94, 0.05)'
                                        },
                                        {
                                            x: [currentFrameIndex],
                                            y: [energyHistory[currentFrameIndex]],
                                            type: 'scatter',
                                            mode: 'markers',
                                            marker: { color: 'white', size: 6, line: { width: 2, color: CHART_COLORS.danger } },
                                            showlegend: false,
                                            hoverinfo: 'skip'
                                        }
                                    ]}
                                    layout={{
                                        ...PREMIUM_CHART_LAYOUT,
                                        title: { text: "" },
                                        xaxis: { ...PREMIUM_CHART_LAYOUT.xaxis, showgrid: false },
                                        yaxis: { ...PREMIUM_CHART_LAYOUT.yaxis, showgrid: true },
                                        margin: { t: 40, r: 20, l: 40, b: 30 },
                                    }}
                                    config={PREMIUM_CHART_CONFIG}
                                    useResizeHandler={true}
                                    style={{ width: "100%", height: "100%" }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 animate-in fade-in duration-700">
                            <div className="relative mb-8 group cursor-pointer" onClick={startSimulation}>
                                <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition duration-500 rounded-full"></div>
                                <div className="relative w-32 h-32 rounded-full border border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition duration-500">
                                    <span className="text-5xl text-zinc-500 group-hover:text-indigo-400 transition duration-500">〰️</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-zinc-300">Stochastic Wave Equation</h3>
                            <p className="mt-3 text-sm text-zinc-500 max-w-sm text-center leading-relaxed">
                                Simulate 1D wave propagation with white noise forcing to observe energy dynamics and dispersion.
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
                        title="Stochastic Wave Equation"
                        description="Models the propagation of waves in a medium with random forcing or uncertain coefficients. It generalizes the classical wave equation to include stochastic terms."
                        formula={[
                            "∂²u/∂t² = c²∂²u/∂x² + σξ(x,t)",
                            "u(x,t): Displacement",
                            "c: Wave Speed",
                            "ξ(x,t): Spatiotemporal White Noise"
                        ]}
                        params={[
                            { label: "Wave Speed (c)", desc: "Determines how fast disturbances travel.", icon: "c" },
                            { label: "Damping", desc: "Energy dissipation factor (friction) limiting resonance.", icon: "γ" },
                            { label: "Integrator", desc: "Leapfrog Scheme (Symplectic).", icon: "∫" }
                        ]}
                        details={[
                            { label: "PDE Type", value: "Hyperbolic Stochastic PDE" },
                            { label: "Stability (CFL)", value: "cΔt/Δx ≤ 1.0" },
                            { label: "Noise Color", value: "Spatial/Temporal White Noise" },
                            { label: "Boundary", value: "Reflecting (Neumann) or Fixed" }
                        ]}
                    />
                </div>
            </div>

        </div>
    );
}
