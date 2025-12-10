"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { solveReaction, ReactionInput } from '../lib/api';
import { PREMIUM_CHART_LAYOUT, PREMIUM_CHART_CONFIG } from '../lib/chartConfig';
import Methodology from './Methodology';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });


interface ReactionDiffusionProps {
    isActive: boolean;
}

export default function ReactionDiffusion({ isActive }: ReactionDiffusionProps) {

    // --- Parameters ---
    // Gray-Scott spots parameters: F=0.035, k=0.060
    const [params, setParams] = useState<ReactionInput>({
        Du: 0.16,
        Dv: 0.08,
        F: 0.035,
        k: 0.060,
        sigma: 0.01,
        T: 100.0, // Shorter chunk for responsiveness
        dt: 1.0,
        dx: 1.0,
        width: 128, // Doubled Resolution
        height: 128,
        init_type: "random_center"
    });

    const [preset, setPreset] = useState<string>("spots");
    const [historyU, setHistoryU] = useState<number[][][]>([]);
    const [historyV, setHistoryV] = useState<number[][][]>([]); // Need V for resuming
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const animationRef = useRef<number | null>(null);
    const simulationRef = useRef(false);
    const latestHistoryU = useRef<number[][][]>([]);
    const latestHistoryV = useRef<number[][][]>([]);

    useEffect(() => {
        simulationRef.current = isSimulating;
    }, [isSimulating]);

    // Presets
    const applyPreset = (name: string) => {
        setPreset(name);
        switch (name) {
            case "spots":
                setParams(p => ({ ...p, F: 0.035, k: 0.060, sigma: 0.01 }));
                break;
            case "stripes":
                setParams(p => ({ ...p, F: 0.054, k: 0.062, sigma: 0.01 }));
                break;
            case "spirals":
                setParams(p => ({ ...p, F: 0.018, k: 0.050, sigma: 0.01 }));
                break;
            case "chaos":
                setParams(p => ({ ...p, F: 0.026, k: 0.051, sigma: 0.05, T: 100 }));
                break;
        }
    };

    const fetchBatch = useCallback(async (startU?: number[][], startV?: number[][]) => {
        try {
            const input: ReactionInput = { ...params };
            if (startU) input.current_u = startU;
            if (startV) input.current_v = startV;

            // Limit T if resuming to avoid massive payloads
            // input.T = 100.0; 

            const res = await solveReaction(input);
            return res;
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Simulation failed");
            setIsSimulating(false);
            return null;
        }
    }, [params]);

    const startSimulation = useCallback(async () => {
        setIsSimulating(true);
        simulationRef.current = true;
        setError(null);

        setHistoryU([]);
        setHistoryV([]);
        latestHistoryU.current = [];
        latestHistoryV.current = [];
        setCurrentFrameIndex(0);

        // 1. Initial Batch
        const firstBatch = await fetchBatch();
        if (!firstBatch || !firstBatch.U || firstBatch.U.length === 0) {
            setIsSimulating(false);
            return;
        }

        setHistoryU(firstBatch.U);
        setHistoryV(firstBatch.V);
        latestHistoryU.current = firstBatch.U;
        latestHistoryV.current = firstBatch.V;

        setIsPlaying(true);

        // 2. Loop
        while (simulationRef.current) {
            const currentU = latestHistoryU.current;
            const currentV = latestHistoryV.current;

            if (currentU.length === 0) break;

            const lastFrameU = currentU[currentU.length - 1];
            const lastFrameV = currentV[currentV.length - 1];

            const nextBatch = await fetchBatch(lastFrameU, lastFrameV);
            if (!nextBatch || !nextBatch.U || nextBatch.U.length === 0) break;

            const newFramesU = nextBatch.U;
            const newFramesV = nextBatch.V;

            setHistoryU(prev => [...prev, ...newFramesU]);
            setHistoryV(prev => [...prev, ...newFramesV]);

            latestHistoryU.current = [...latestHistoryU.current, ...newFramesU];
            latestHistoryV.current = [...latestHistoryV.current, ...newFramesV];

            // Manage memory? Keep last N? For now unlimited, standard browser limit.

            await new Promise(r => setTimeout(r, 100));
        }
    }, [params, fetchBatch]);

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: (name === "init_type" ? value : parseFloat(value))
        }));
    };

    // Animation Loop
    useEffect(() => {
        if (isPlaying && historyU.length > 0) {
            const animate = () => {
                setCurrentFrameIndex(prev => {
                    // If near end, wait? Or just clamp.
                    // The infinite loop appends frames.
                    if (prev >= historyU.length - 1) {
                        // If sim stopped, maybe loop? If running, wait for new frames.
                        if (!simulationRef.current) return 0; // Loop if stopped
                        return prev; // Wait at end if running
                    }
                    return prev + 1;
                });
                animationRef.current = requestAnimationFrame(animate);
            };
            // Use RAF for smoothness
            animationRef.current = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationRef.current!);
        }
    }, [isPlaying, historyU.length]);

    return (
        <div className="flex h-full w-full bg-transparent text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-black/60 backdrop-blur-lg p-6 flex flex-col gap-6 overflow-y-auto border-r border-white/10 shadow-2xl z-10 shrink-0 custom-scrollbar">

                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Reaction Control</h2>
                    <button
                        onClick={startSimulation}
                        disabled={isSimulating}
                        className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${isSimulating
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/20'
                            }`}
                    >
                        {isSimulating ? "Generating Infinite..." : "Start Infinite Pattern"}
                    </button>
                    <button
                        onClick={() => { setIsSimulating(false); setIsPlaying(false); }}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition text-zinc-400 hover:text-white border border-white/5"
                    >
                        Stop Generation
                    </button>

                    <div>
                        <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Pattern Preset</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['spots', 'stripes', 'spirals', 'chaos'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => applyPreset(p)}
                                    className={`py-2 rounded-lg text-xs font-medium border transition ${preset === p
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Parameters */}
                <div className="space-y-6 border-t border-white/10 pt-6">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Gray-Scott Parameters</h2>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Feed Rate (F)</label>
                                <input type="number" step="0.001" name="F" value={params.F} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Kill Rate (k)</label>
                                <input type="number" step="0.001" name="k" value={params.k} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Diffusion U</label>
                                <input type="number" step="0.01" name="Du" value={params.Du} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Diffusion V</label>
                                <input type="number" step="0.01" name="Dv" value={params.Dv} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Init Condition</label>
                            <select
                                name="init_type" value={params.init_type} onChange={handleParamChange}
                                className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-emerald-500/50"
                            >
                                <option value="random_center" className="bg-gray-900">Perturbed Center</option>
                                <option value="random_everywhere" className="bg-gray-900">Full Noise</option>
                                <option value="spots" className="bg-gray-900">Multiple Spots</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Resolution (Grid)</label>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" name="width" value={params.width} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-emerald-500/50 outline-none" placeholder="W" />
                                <input type="number" name="height" value={params.height} onChange={handleParamChange} className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 focus:border-emerald-500/50 outline-none" placeholder="H" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Noise (σ)</label>
                            <input type="range" min="0" max="0.5" step="0.01" name="sigma" value={params.sigma} onChange={handleParamChange} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative bg-transparent p-6 overflow-y-auto custom-scrollbar min-h-0">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                <div className="bg-black/40 rounded-3xl shadow-2xl border border-white/5 p-1 backdrop-blur-md relative overflow-hidden group min-h-[500px] shrink-0">
                    <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">Concentration U(x,y)</div>
                    <div className="absolute top-4 right-6 text-xs font-mono text-zinc-500 z-10">{params.width}x{params.height}</div>

                    {historyU.length > 0 ? (
                        <div className="w-full h-full relative">
                            <Plot
                                data={[
                                    {
                                        z: historyU[currentFrameIndex],
                                        type: 'heatmap',
                                        colorscale: 'Viridis',
                                        showscale: false,
                                        zmin: 0,
                                        zmax: 1
                                    }
                                ]}
                                layout={{
                                    ...PREMIUM_CHART_LAYOUT,
                                    margin: { t: 0, r: 0, l: 0, b: 0 },
                                    xaxis: { visible: false },
                                    yaxis: { visible: false, scaleanchor: 'x' },
                                }}
                                config={PREMIUM_CHART_CONFIG}
                                useResizeHandler={true}
                                style={{ width: "100%", height: "100%" }}
                            />

                            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md rounded-lg p-2 text-xs text-zinc-400 border border-white/10 flex items-center gap-2">
                                <span className={isSimulating ? "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" : "w-2 h-2 rounded-full bg-zinc-500"}></span>
                                Frame {currentFrameIndex + 1}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-600 animate-in fade-in duration-700">
                            <div className="relative mb-8 group cursor-pointer" onClick={startSimulation}>
                                <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 group-hover:opacity-40 transition duration-500 rounded-full"></div>
                                <div className="relative w-32 h-32 rounded-full border border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition duration-500">
                                    <span className="text-5xl text-zinc-500 group-hover:text-emerald-400 transition duration-500">🦠</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-zinc-300">Reaction-Diffusion System</h3>
                            <p className="mt-3 text-sm text-zinc-500 max-w-sm text-center leading-relaxed">
                                Form Turing patterns and spirals using the stochastic Gray-Scott model.
                            </p>
                        </div>
                    )}
                </div>

                <Methodology
                    title="Reaction-Diffusion System (Gray-Scott)"
                    description="Simulates the interaction of two chemical species (U and V) that diffuse and react, producing complex spatial patterns like spots and stripes (Turing patterns)."
                    formula={[
                        "∂u/∂t = Dᵤ∇²u - uv² + F(1-u)",
                        "∂v/∂t = Dᵥ∇²v + uv² - (F+k)v",
                        "u, v: Concentrations",
                        "F: Feed Rate, k: Kill Rate"
                    ]}
                    params={[
                        { label: "Feed Rate (F)", desc: "Rate at which U is added to the system.", icon: "F" },
                        { label: "Kill Rate (k)", desc: "Rate at which V is removed from the system.", icon: "k" },
                        { label: "Diffusion", desc: "Du and Dv control the spread of species relative to reaction.", icon: "D" }
                    ]}
                    details={[
                        { label: "Model", value: "Gray-Scott" },
                        { label: "Pattern Type", value: "Turing Instability" },
                        { label: "Grid", value: "2D Finite Difference Laplacian" },
                        { label: "Noise Role", value: "Symmetry Breaking for Initial Seed" }
                    ]}
                />
            </div>

        </div>
    );
}
