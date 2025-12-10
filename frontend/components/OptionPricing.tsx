"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { calculatePrice, PricingInput, PricingResponse } from '../lib/api';
import { PREMIUM_CHART_LAYOUT, PREMIUM_CHART_CONFIG, CHART_COLORS } from '../lib/chartConfig';
import Methodology from './Methodology';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });


interface OptionPricingProps {
    isActive: boolean;
}

// --- Client-side BS Logic for Charting ---
// Numerical approximation of Normal CDF (Abramowitz & Stegun)
function normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989422804014337 * Math.exp(-x * x / 2);
    let prob = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    if (x > 0) prob = 1 - prob;
    return prob;
}

function calculateBS_Client(S: number, K: number, T: number, r: number, sigma: number, type: "call" | "put"): number {
    if (T <= 0) return type === "call" ? Math.max(0, S - K) : Math.max(0, K - S);

    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    if (type === "call") {
        return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
    } else {
        return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
    }
}


export default function OptionPricing({ isActive }: OptionPricingProps) {

    // --- Parameters ---
    const [params, setParams] = useState<PricingInput>({
        S: 100,
        K: 100,
        T: 1.0,
        r: 0.05,
        sigma: 0.2,
        option_type: "call"
    });

    const [result, setResult] = useState<PricingResponse | null>(null);
    const [loading, setLoading] = useState(false);

    // --- Logic ---
    // Precise calculation via Backend
    const updatePrice = useCallback(async () => {
        setLoading(true);
        try {
            const res = await calculatePrice(params);
            setResult(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [params]);

    // Auto-update on param change
    useEffect(() => {
        if (isActive) {
            updatePrice();
        }
    }, [params, isActive, updatePrice]);

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: name === "option_type" ? value : parseFloat(value)
        }));
    };

    // --- Chart Data Generation ---
    const chartData = useMemo(() => {
        const { K, T, r, sigma, option_type } = params;
        const xObj: number[] = [];
        const yCurrent: number[] = [];
        const yIntrinsic: number[] = [];

        // Generate range: 50% to 150% of Strike
        const minS = Math.floor(K * 0.5);
        const maxS = Math.ceil(K * 1.5);
        const steps = 50;
        const stepSize = (maxS - minS) / steps;

        for (let i = 0; i <= steps; i++) {
            const s = minS + i * stepSize;
            xObj.push(s);

            // Current Theoretical Price
            yCurrent.push(calculateBS_Client(s, K, T, r, sigma, option_type));

            // Intrinsic Value (at Expiry)
            const intrinsic = option_type === "call" ? Math.max(0, s - K) : Math.max(0, K - s);
            yIntrinsic.push(intrinsic);
        }

        return { x: xObj, yCurrent, yIntrinsic };
    }, [params]);

    // Helper for formatting
    const fmt = (n: number | undefined) => n !== undefined ? n.toFixed(4) : "-";

    return (
        <div className="flex h-full w-full bg-transparent text-white font-sans overflow-hidden">
            {/* Sidebar Controls */}
            <div className="w-80 bg-black/60 backdrop-blur-lg p-6 flex flex-col gap-6 border-r border-white/10 shadow-2xl z-10 shrink-0 overflow-y-auto custom-scrollbar">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-400">Option Pricing</h1>

                <div className="space-y-5">
                    {/* Option Type */}
                    <div className="bg-white/5 p-1 rounded-xl flex text-sm border border-white/5">
                        <button
                            onClick={() => setParams(p => ({ ...p, option_type: "call" }))}
                            className={`flex-1 py-2 rounded-lg transition-all font-medium ${params.option_type === "call"
                                ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
                        >
                            Call
                        </button>
                        <button
                            onClick={() => setParams(p => ({ ...p, option_type: "put" }))}
                            className={`flex-1 py-2 rounded-lg transition-all font-medium ${params.option_type === "put"
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
                        >
                            Put
                        </button>
                    </div>

                    {/* Price Output Card */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                        <div className="relative bg-black/40 border border-white/10 rounded-2xl p-6 shadow-inner text-center backdrop-blur-sm">
                            <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">Theoretical Price</div>
                            <div className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">
                                ${result ? result.price.toFixed(2) : "---"}
                            </div>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-6 pt-2">
                        {/* Reusable Slider Component Style */}
                        {[
                            { label: "Spot Price (S)", name: "S", min: 1, max: 500, step: 1 },
                            { label: "Strike Price (K)", name: "K", min: 1, max: 500, step: 1 },
                            { label: "Time (Years)", name: "T", min: 0.1, max: 5, step: 0.1 },
                            { label: "Volatility (σ)", name: "sigma", min: 0.01, max: 2, step: 0.01 },
                            { label: "Risk-free Rate (r)", name: "r", min: 0, max: 0.2, step: 0.01 },
                        ].map((field) => (
                            <div key={field.name}>
                                <div className="flex justify-between mb-2">
                                    <label className="text-zinc-400 text-xs uppercase font-bold tracking-wider">{field.label}</label>
                                    <span className="text-cyan-400 text-xs font-mono bg-cyan-900/20 px-1.5 py-0.5 rounded border border-cyan-900/30">
                                        {(params as any)[field.name]}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={field.min}
                                    max={field.max}
                                    step={field.step}
                                    name={field.name}
                                    value={(params as any)[field.name]}
                                    onChange={handleParamChange}
                                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content: Greeks Dashboard */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar min-h-0">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-teal-500 rounded-full"></span>
                    Risk Sensitivities (Greeks)
                </h2>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {/* Greeks Cards */}
                    {[
                        { label: "Delta (Δ)", value: result?.delta, color: "text-purple-400", border: "group-hover:border-purple-500/50" },
                        { label: "Gamma (Γ)", value: result?.gamma, color: "text-blue-400", border: "group-hover:border-blue-500/50" },
                        { label: "Theta (Θ)", value: result?.theta, color: "text-yellow-400", border: "group-hover:border-yellow-500/50" },
                        { label: "Vega (ν)", value: result?.vega, color: "text-green-400", border: "group-hover:border-green-500/50" },
                        { label: "Rho (ρ)", value: result?.rho, color: "text-red-400", border: "group-hover:border-red-500/50" },
                    ].map((greek, i) => (
                        <div key={i} className={`group bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:transform hover:-translate-y-1 ${greek.border}`}>
                            <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{greek.label}</div>
                            <div className={`text-2xl font-bold ${greek.color} drop-shadow-sm font-mono`}>{fmt(greek.value)}</div>
                        </div>
                    ))}
                </div>

                {/* Theoretical Price Chart */}
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                    Price vs. Spot (Payoff Diagram)
                </h2>
                <div className="bg-black/40 rounded-3xl shadow-2xl border border-white/10 p-6 backdrop-blur-md relative min-h-[400px]">
                    <Plot
                        data={[
                            {
                                x: chartData.x,
                                y: chartData.yIntrinsic,
                                type: 'scatter',
                                mode: 'lines',
                                name: 'Intrinsic Value (Expiry)',
                                line: { color: '#52525b', width: 2, dash: 'dash' }
                            },
                            {
                                x: chartData.x,
                                y: chartData.yCurrent,
                                type: 'scatter',
                                mode: 'lines',
                                name: 'Theoretical Price (Current)',
                                line: { color: params.option_type === "call" ? CHART_COLORS.primary : CHART_COLORS.secondary, width: 3 },
                                fill: 'tozeroy',
                                fillcolor: params.option_type === "call" ? 'rgba(45, 212, 191, 0.1)' : 'rgba(59, 130, 246, 0.1)'
                            },
                            {
                                x: [params.S, params.S],
                                y: [0, Math.max(...chartData.yCurrent) * 1.1],
                                type: 'scatter',
                                mode: 'lines',
                                name: 'Current Spot',
                                line: { color: 'white', width: 1, dash: 'dot' },
                                hoverinfo: 'skip'
                            }
                        ]}
                        layout={{
                            ...PREMIUM_CHART_LAYOUT,
                            title: { text: '' },
                            xaxis: {
                                ...PREMIUM_CHART_LAYOUT.xaxis,
                                title: { text: 'Spot Price ($)', font: { size: 12, color: '#71717a' } },
                                showgrid: true
                            },
                            yaxis: {
                                ...PREMIUM_CHART_LAYOUT.yaxis,
                                title: { text: 'Option Value ($)', font: { size: 12, color: '#71717a' } },
                                showgrid: true
                            },
                            margin: { t: 20, r: 20, l: 60, b: 60 },
                            showlegend: true,
                            legend: {
                                x: 0.02, y: 0.98,
                                font: { color: '#d4d4d8', size: 12 },
                                bgcolor: 'rgba(0,0,0,0.7)',
                                bordercolor: 'rgba(255,255,255,0.1)',
                                borderwidth: 1
                            },
                            hovermode: "closest"
                        }}
                        config={PREMIUM_CHART_CONFIG}
                        useResizeHandler={true}
                        style={{ width: "100%", height: "100%" }}
                    />
                </div>

                <Methodology
                    title="Black-Scholes-Merton Model"
                    description="A mathematical model for the dynamics of a financial market containing derivative investment instruments. It provides a theoretical estimate of the price of European-style options."
                    formula={[
                        "C(S, t) = N(d₁)Sₜ - N(d₂)Ke⁻ʳ⁽ᵀ⁻ᵗ⁾",
                        "d₁ = (ln(S/K) + (r + σ²/2)T) / (σ√T)",
                        "d₂ = d₁ - σ√T",
                        "N(•): CDF of Standard Normal Distribution"
                    ]}
                    params={[
                        { label: "Strike (K)", desc: "The set price at which the option can be exercised.", icon: "K" },
                        { label: "Risk-free Rate (r)", desc: "Theoretical return of an investment with zero risk.", icon: "r" },
                        { label: "Greeks", desc: "Delta (Δ), Gamma (Γ), Theta (Θ), Vega (ν), Rho (ρ).", icon: "Σ" }
                    ]}
                    details={[
                        { label: "Option Style", value: "European (Exercise at Expiry)" },
                        { label: "Assumption", value: "Constant Volatility & Rate" },
                        { label: "Greeks Method", value: "Closed-Form Analytic Derivatives" },
                        { label: "Underlying", value: "Non-Dividend Paying Stock" }
                    ]}
                />
            </div>

        </div>
    );
}
