"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { simulateHedging, HedgingInput, HedgingResponse } from '../lib/api';
import { PREMIUM_CHART_LAYOUT, PREMIUM_CHART_CONFIG, CHART_COLORS } from '../lib/chartConfig';
import Methodology from './Methodology';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });


interface DeltaHedgingProps {
    isActive: boolean;
}

export default function DeltaHedging({ isActive }: DeltaHedgingProps) {

    // --- Parameters ---
    const [params, setParams] = useState<HedgingInput>({
        S0: 100,
        K: 100,
        T: 1.0,
        r: 0.05,
        sigma: 0.2,
        mu: 0.1, // Positive drift for stock
        option_type: "call",
        rebalance_freq: "daily"
    });

    const [data, setData] = useState<HedgingResponse | null>(null);
    const [loading, setLoading] = useState(false);

    // --- Logic ---
    const runSimulation = useCallback(async () => {
        setLoading(true);
        try {
            const res = await simulateHedging(params);
            setData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [params]);

    // Run once on mount/active if no data
    useEffect(() => {
        if (isActive && !data && !loading) {
            runSimulation();
        }
    }, [isActive, data, loading, runSimulation]);

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: (name === "option_type" || name === "rebalance_freq") ? value : parseFloat(value)
        }));
    };

    return (
        <div className="flex h-full w-full bg-transparent text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-black/60 backdrop-blur-lg p-6 flex flex-col gap-6 border-r border-white/10 shadow-2xl z-10 shrink-0 overflow-y-auto custom-scrollbar">

                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Simulation Control</h2>
                    <button
                        onClick={runSimulation}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${loading
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/20"
                            }`}
                    >
                        {loading ? "Simulating..." : "Run Hedging Sim"}
                    </button>

                </div>

                {/* Parameters */}
                <div className="space-y-6 border-t border-white/10 pt-6">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Hedging Strategy</h2>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Position</label>
                                <select
                                    name="option_type"
                                    value={params.option_type}
                                    onChange={handleParamChange}
                                    className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-cyan-500/50"
                                >
                                    <option value="call" className="bg-gray-900">Short Call</option>
                                    <option value="put" className="bg-gray-900">Short Put</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Rebalancing</label>
                                <select
                                    name="rebalance_freq"
                                    value={params.rebalance_freq}
                                    onChange={handleParamChange}
                                    className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-cyan-500/50"
                                >
                                    <option value="daily" className="bg-gray-900">Daily</option>
                                    <option value="weekly" className="bg-gray-900">Weekly</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-5 pt-2">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-zinc-400 text-xs font-medium">Initial Price (S0)</label>
                                    <span className="text-white text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded">{params.S0}</span>
                                </div>
                                <input type="range" min="50" max="200" step="1" name="S0" value={params.S0} onChange={handleParamChange} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400" />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-zinc-400 text-xs font-medium">Strike Price (K)</label>
                                    <span className="text-white text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded">{params.K}</span>
                                </div>
                                <input type="range" min="50" max="200" step="1" name="K" value={params.K} onChange={handleParamChange} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400" />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-zinc-400 text-xs font-medium">Volatility (σ)</label>
                                    <span className="text-white text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded">{params.sigma}</span>
                                </div>
                                <input type="range" min="0.05" max="1.0" step="0.01" name="sigma" value={params.sigma} onChange={handleParamChange} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400" />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-zinc-400 text-xs font-medium">Realized Drift (μ)</label>
                                    <span className="text-white text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded">{params.mu}</span>
                                </div>
                                <input type="range" min="-0.5" max="0.5" step="0.01" name="mu" value={params.mu} onChange={handleParamChange} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                {data && (
                    <div className="mt-auto bg-gradient-to-br from-white/5 to-white/[0.02] p-4 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total PnL (Gamma Loss)</div>
                        <div className={`text-3xl font-bold font-mono tracking-tight ${data.pnl[data.pnl.length - 1] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${data.pnl[data.pnl.length - 1].toFixed(2)}
                        </div>
                    </div>
                )}
            </div>

            {/* Charts Grid */}
            <div className="flex-1 p-6 overflow-y-auto relative custom-scrollbar">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                <div className="grid grid-rows-2 gap-6 h-full">
                    {/* Top Row: Price Path and PnL */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[300px]">
                        {/* Stock Price Chart */}
                        <div className="bg-black/40 rounded-3xl border border-white/5 p-1 backdrop-blur-md relative shadow-xl overflow-hidden">
                            <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">Underlying Asset Price</div>
                            {data ? (
                                <Plot
                                    data={[
                                        { x: data.time, y: data.stock_price, type: 'scatter', mode: 'lines', name: 'Stock', line: { color: CHART_COLORS.primary, width: 2 } },
                                        { x: data.time, y: Array(data.time.length).fill(params.K), type: 'scatter', mode: 'lines', name: 'Strike', line: { color: CHART_COLORS.grid, dash: 'dash', width: 1 } }
                                    ]}
                                    layout={{
                                        ...PREMIUM_CHART_LAYOUT,
                                        title: { text: '' },
                                        xaxis: { ...PREMIUM_CHART_LAYOUT.xaxis, showgrid: true },
                                        yaxis: { ...PREMIUM_CHART_LAYOUT.yaxis, showgrid: true },
                                        margin: { t: 40, b: 30, l: 40, r: 20 },
                                    }}
                                    config={PREMIUM_CHART_CONFIG}
                                    style={{ width: '100%', height: '100%' }}
                                    useResizeHandler
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                                    Waiting for simulation...
                                </div>
                            )}
                        </div>

                        {/* PnL Chart */}
                        <div className="bg-black/40 rounded-3xl border border-white/5 p-1 backdrop-blur-md relative shadow-xl overflow-hidden">
                            <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">Cumulative Hedge PnL</div>
                            {data ? (
                                <Plot
                                    data={[
                                        { x: data.time, y: data.pnl, type: 'scatter', mode: 'lines', name: 'PnL', line: { color: data.pnl[data.pnl.length - 1] >= 0 ? CHART_COLORS.success : CHART_COLORS.danger, width: 2 }, fill: 'tozeroy', fillcolor: data.pnl[data.pnl.length - 1] >= 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(244, 63, 94, 0.1)' }
                                    ]}
                                    layout={{
                                        ...PREMIUM_CHART_LAYOUT,
                                        title: { text: '' },
                                        xaxis: { ...PREMIUM_CHART_LAYOUT.xaxis, showgrid: true },
                                        yaxis: { ...PREMIUM_CHART_LAYOUT.yaxis, showgrid: true },
                                        margin: { t: 40, b: 30, l: 40, r: 20 },
                                    }}
                                    config={PREMIUM_CHART_CONFIG}
                                    style={{ width: '100%', height: '100%' }}
                                    useResizeHandler
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                                    Waiting for simulation...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Row: Delta Exposure */}
                    <div className="bg-black/40 rounded-3xl border border-white/5 p-1 backdrop-blur-md relative shadow-xl overflow-hidden min-h-[250px]">
                        <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">Delta Exposure (Hedge Ratio)</div>
                        {data ? (
                            <Plot
                                data={[
                                    { x: data.time, y: data.delta, type: 'scatter', mode: 'lines', name: 'Delta', line: { color: CHART_COLORS.secondary, width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(129, 140, 248, 0.1)' }
                                ]}
                                layout={{
                                    ...PREMIUM_CHART_LAYOUT,
                                    title: { text: '' },
                                    xaxis: { ...PREMIUM_CHART_LAYOUT.xaxis, showgrid: true },
                                    yaxis: { ...PREMIUM_CHART_LAYOUT.yaxis, showgrid: true },
                                    margin: { t: 40, b: 30, l: 40, r: 20 },
                                }}
                                config={PREMIUM_CHART_CONFIG}
                                style={{ width: '100%', height: '100%' }}
                                useResizeHandler
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                                Waiting for simulation...
                            </div>
                        )}
                    </div>
                </div>

                <Methodology
                    title="Dynamic Delta Hedging"
                    description="Simulates the process of maintaining a delta-neutral portfolio to hedge against price movements of an underlying asset. The strategy involves continuously rebalancing the portfolio by buying or selling the underlying asset."
                    formula={[
                        "Π = V_option - Δ · S",
                        "Δ = ∂V/∂S (Hedge Ratio)",
                        "PnL arises from discrete rebalancing errors and Gamma exposure."
                    ]}
                    params={[
                        { label: "Rebalancing", desc: "How frequently the hedge is adjusted (Daily vs Weekly).", icon: "t" },
                        { label: "Gamma Risk", desc: "Risk that Delta changes significantly between rebalancing.", icon: "Γ" },
                        { label: "Transaction Costs", desc: "Impact of spread/fees on PnL (Ignored here).", icon: "$" }
                    ]}
                    details={[
                        { label: "Strategy", value: "Delta Neutral" },
                        { label: "Rebalancing", value: "Discrete Time Intervals" },
                        { label: "Source of Loss", value: "Gamma Convexity & Volatility" },
                        { label: "Ideal PnL", value: "Zero (Perfect Hedge)" }
                    ]}
                />
            </div>

        </div>
    );
}
