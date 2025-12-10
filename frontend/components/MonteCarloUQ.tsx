"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { solveUQ, UQInput, UQResponse } from '../lib/api';
import { PREMIUM_CHART_LAYOUT, PREMIUM_CHART_CONFIG, CHART_COLORS } from '../lib/chartConfig';
import Methodology from './Methodology';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });



interface MonteCarloUQProps {
    isActive: boolean;
}

export default function MonteCarloUQ({ isActive }: MonteCarloUQProps) {

    // --- State ---
    const [activeModel, setActiveModel] = useState<"gbm" | "pricing">("gbm");
    const [nSims, setNSims] = useState(1000);
    const [isSimulating, setIsSimulating] = useState(false);

    // Store results separately
    const [gbmResult, setGbmResult] = useState<UQResponse | null>(null);
    const [pricingResult, setPricingResult] = useState<UQResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Params Config
    const [gbmParams, setGbmParams] = useState({ S0: 100, mu: 0.05, sigma: 0.2, T: 1.0 });
    const [pricingParams, setPricingParams] = useState({ S: 100, K: 100, T: 1.0, r: 0.05, sigma: 0.2, option_type: "call" });

    // Sweep Config must be separate too
    const [gbmSweep, setGbmSweep] = useState({ param: "sigma", min: 0.1, max: 0.4 });
    const [pricingSweep, setPricingSweep] = useState({ param: "S", min: 80, max: 120 });

    const handleRun = async () => {
        setIsSimulating(true);
        setError(null);
        try {
            // Build Inputs for BOTH
            // GBM
            const gbmRanges: any = {};
            if (gbmSweep.max > gbmSweep.min) {
                gbmRanges[gbmSweep.param] = { min: gbmSweep.min, max: gbmSweep.max };
            }
            const gbmInput: UQInput = {
                model_type: "gbm",
                n_sims: nSims,
                base_params: gbmParams,
                param_ranges: gbmRanges
            };

            // Pricing
            const pricingRanges: any = {};
            if (pricingSweep.max > pricingSweep.min) {
                pricingRanges[pricingSweep.param] = { min: pricingSweep.min, max: pricingSweep.max };
            }
            const pricingInput: UQInput = {
                model_type: "pricing",
                n_sims: nSims,
                base_params: pricingParams, // Need to cast or pass as any? API allows any.
                param_ranges: pricingRanges
            } as any; // Cast for option_type string safety if needed

            // Execute in Parallel
            const [resGbm, resPricing] = await Promise.all([
                solveUQ(gbmInput),
                solveUQ(pricingInput)
            ]);

            setGbmResult(resGbm);
            setPricingResult(resPricing);

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Simulation failed");
        } finally {
            setIsSimulating(false);
        }
    };

    // Helper to get current view data
    const currentResult = activeModel === "gbm" ? gbmResult : pricingResult;
    const currentSweepState = activeModel === "gbm" ? gbmSweep : pricingSweep;
    const updateSweepState = (field: string, value: any) => {
        if (activeModel === "gbm") {
            setGbmSweep(prev => ({ ...prev, [field]: value }));
        } else {
            setPricingSweep(prev => ({ ...prev, [field]: value }));
        }
    };

    return (
        <div className="flex h-full w-full bg-transparent text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-black/60 backdrop-blur-lg p-6 flex flex-col gap-6 overflow-y-auto border-r border-white/10 shadow-2xl z-10 shrink-0 custom-scrollbar">

                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Setup Analysis</h2>

                    <div>
                        <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Active View</label>
                        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                            {(['gbm', 'pricing'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setActiveModel(m)}
                                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${activeModel === m
                                        ? 'bg-amber-500/20 text-amber-400 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    {m === "gbm" ? "GBM" : "PRICING"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Simulations (N)</label>
                        <select
                            value={nSims}
                            onChange={(e) => setNSims(parseInt(e.target.value))}
                            className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-amber-500/50"
                        >
                            <option value="100" className="bg-gray-900">100 (Fast)</option>
                            <option value="1000" className="bg-gray-900">1,000 (Standard)</option>
                            <option value="5000" className="bg-gray-900">5,000 (Detailed)</option>
                            <option value="10000" className="bg-gray-900">10,000 (High Precision)</option>
                        </select>
                    </div>

                    <button
                        onClick={handleRun}
                        disabled={isSimulating}
                        className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${isSimulating
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/20'
                            }`}
                    >
                        {isSimulating ? "Simulating Both Models..." : "Run Analysis (Both)"}
                    </button>
                    <p className="text-[10px] text-zinc-500 text-center">
                        Generates results for both GBM and Pricing models simultaneously.
                    </p>
                </div>

                <div className="border-t border-white/10 pt-6 space-y-4">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                        {activeModel === "gbm" ? "GBM Hypothesis" : "Pricing Hypothesis"}
                    </h2>

                    <div className="space-y-4 animate-in fade-in duration-300" key={activeModel}>
                        <div>
                            <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Sweep Parameter</label>
                            <select
                                value={currentSweepState.param}
                                onChange={(e) => updateSweepState("param", e.target.value)}
                                className="w-full bg-white/5 text-white rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-amber-500/50 text-sm"
                            >
                                <option value="sigma" className="bg-gray-900">Volatility (Sigma)</option>
                                {activeModel === "gbm" && <option value="mu" className="bg-gray-900">Drift (Mu)</option>}
                                {activeModel === "pricing" && <option value="S" className="bg-gray-900">Spot Price (S)</option>}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-zinc-500 text-[10px] mb-1">Min Value</label>
                                <input
                                    type="number" step="0.01"
                                    value={currentSweepState.min} onChange={(e) => updateSweepState("min", parseFloat(e.target.value))}
                                    className="w-full bg-white/5 text-white rounded px-2 py-1.5 text-xs border border-white/10 focus:border-amber-500/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-500 text-[10px] mb-1">Max Value</label>
                                <input
                                    type="number" step="0.01"
                                    value={currentSweepState.max} onChange={(e) => updateSweepState("max", parseFloat(e.target.value))}
                                    className="w-full bg-white/5 text-white rounded px-2 py-1.5 text-xs border border-white/10 focus:border-amber-500/50 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 relative bg-transparent overflow-y-auto custom-scrollbar min-h-0">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                {currentResult ? (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500" key={activeModel}>
                        {/* Histogram */}
                        <div className="bg-black/40 rounded-3xl shadow-2xl border border-white/5 p-4 backdrop-blur-md relative overflow-hidden min-h-[500px] shrink-0">
                            <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase tracking-widest z-10">
                                {activeModel === "gbm" ? "Final Price Distribution (GBM)" : "Option Price Distribution (Black-Scholes)"}
                            </div>
                            <Plot
                                data={[
                                    {
                                        x: currentResult.histogram.bins,
                                        y: currentResult.histogram.counts,
                                        type: 'bar',
                                        marker: {
                                            color: activeModel === "gbm" ? CHART_COLORS.accent : CHART_COLORS.secondary,
                                            opacity: 0.8
                                        },
                                        name: 'Frequency'
                                    }
                                ]}
                                layout={{
                                    ...PREMIUM_CHART_LAYOUT,
                                    title: { text: '' },
                                    xaxis: { ...PREMIUM_CHART_LAYOUT.xaxis, title: { text: 'Outcome Value' } },
                                    yaxis: { ...PREMIUM_CHART_LAYOUT.yaxis, title: { text: 'Count' } },
                                    bargap: 0.05
                                }}
                                config={PREMIUM_CHART_CONFIG}
                                useResizeHandler={true}
                                style={{ width: "100%", height: "100%" }}
                            />
                        </div>

                        {/* Stats Cards */}
                        <div className="h-32 grid grid-cols-4 gap-4">
                            {[
                                { label: "Mean Outcome", value: currentResult.stats.mean.toFixed(4), color: "text-zinc-200" },
                                { label: "Std Deviation", value: currentResult.stats.std.toFixed(4), color: "text-blue-400" },
                                { label: "95% VaR (Risk)", value: currentResult.stats.var_95.toFixed(4), color: "text-rose-400" },
                                { label: "Max Outcome", value: currentResult.stats.max.toFixed(4), color: "text-emerald-400" },
                            ].map((stat, i) => (
                                <div key={i} className="bg-black/40 rounded-2xl border border-white/5 p-4 backdrop-blur-md flex flex-col justify-center gap-1">
                                    <span className="text-xs text-zinc-500 uppercase font-bold">{stat.label}</span>
                                    <span className={`text-2xl font-mono font-medium ${stat.color}`}>{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 animate-in fade-in duration-700">
                        <div className="relative mb-8 group cursor-pointer" onClick={handleRun}>
                            <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 group-hover:opacity-40 transition duration-500 rounded-full"></div>
                            <div className="relative w-32 h-32 rounded-full border border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition duration-500">
                                <span className="text-5xl text-zinc-500 group-hover:text-amber-400 transition duration-500">⚡</span>
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-zinc-300">Run Total Analysis</h3>
                        <p className="mt-3 text-sm text-zinc-500 max-w-sm text-center leading-relaxed">
                            Click to run simulations for BOTH models simultaneously. Switch views to compare results.
                        </p>
                    </div>
                )}

                <Methodology
                    title="Monte Carlo Uncertainty Quantification"
                    description="Assess the impact of parameter uncertainty on simulation outcomes. We run thousands of scenarios by randomly sampling parameters (like Volatility or Spot Price) to generate a probability distribution of results."
                    formula={[
                        "Histogram approximates the probability density function (PDF).",
                        "VaR (Value at Risk) at 95%: The threshold where 5% of worst-case outcomes occur.",
                        "Convergence: Accuracy increases with √N (Law of Large Numbers)."
                    ]}
                    params={[
                        { label: "Sweep Parameter", desc: "The variable randomized across a range (e.g., Sigma [0.1, 0.5]).", icon: "⚄" },
                        { label: "Sample Size (N)", desc: "Higher N improves statistical accuracy/smoothness.", icon: "N" },
                        { label: "Models", desc: "Switch between GBM (Path) and Tuning (Pricing) logic.", icon: "⚙️" }
                    ]}
                    details={[
                        { label: "Sampling", value: "Uniform Random (Parameter Sweep)" },
                        { label: "Stats", value: "Mean, Std Dev, VaR 95%, Max/Min" },
                        { label: "Output", value: "Empirical Distribution Function" },
                        { label: "Compute", value: "Batch Parallelized (Backend)" }
                    ]}
                />
            </div>

        </div>
    );
}
