import React from 'react';

interface MethodologyProps {
    title: string;
    description: string;
    formula?: string[];
    params?: { label: string; desc: string; icon?: string }[];
    details?: { label: string; value: string }[];
}

export default function Methodology({ title, description, formula, params, details }: MethodologyProps) {
    return (
        <div className="bg-zinc-900/80 rounded-3xl border border-white/5 p-8 backdrop-blur-xl shadow-2xl mt-8 relative overflow-hidden group mb-8">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-teal-500/10 transition duration-700 -z-10"></div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-8 relative z-10 border-b border-white/5 pb-4">
                <div className="h-8 w-1.5 bg-gradient-to-b from-teal-400 to-emerald-500 rounded-full shadow-[0_0_15px_rgba(45,212,191,0.5)]"></div>
                <h3 className="text-xl font-bold text-zinc-200 tracking-wide font-display">
                    {title}
                </h3>
                <span className="ml-auto text-[10px] font-bold text-teal-400 uppercase tracking-widest border border-teal-500/20 px-3 py-1.5 rounded-full bg-teal-500/10 shadow-[0_0_10px_rgba(45,212,191,0.1)]">
                    Methodology
                </span>
            </div>

            <div className="space-y-10 relative z-10">
                {/* Description */}
                <p className="text-zinc-400 text-sm leading-7 max-w-4xl font-light tracking-wide">
                    {description}
                </p>

                {/* Formula Section */}
                {formula && formula.length > 0 && (
                    <div className="bg-black/40 rounded-2xl border border-white/5 p-8 relative overflow-hidden shadow-inner group/formula">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-zinc-700 to-zinc-900"></div>
                        <div className="font-mono text-sm text-zinc-300 space-y-4 overflow-x-auto custom-scrollbar pb-2">
                            {formula.map((line, i) => (
                                <div key={i} className="flex items-center gap-6 group/line hover:translate-x-1 transition-transform duration-300">
                                    <span className="text-zinc-700 text-xs font-bold select-none w-6 text-right font-sans opacity-50">{(i + 1).toString().padStart(2, '0')}</span>
                                    <span className="group-hover/line:text-teal-400 transition-colors tracking-tight">{line}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Parameters Grid */}
                    {params && params.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500/50"></span>
                                Key Parameters
                            </h4>
                            <div className="grid grid-cols-1 gap-3">
                                {params.map((p, i) => (
                                    <div key={i} className="bg-white/[0.02] rounded-xl p-4 border border-white/5 flex items-start gap-4 hover:bg-white/[0.05] hover:border-teal-500/20 transition-all duration-300 group/param">
                                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 text-sm font-bold border border-teal-500/20 shrink-0 group-hover/param:shadow-[0_0_15px_rgba(45,212,191,0.2)] transition-shadow">
                                            {p.icon || p.label.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-zinc-200 font-bold text-xs mb-1 group-hover/param:text-teal-200 transition-colors">{p.label}</div>
                                            <div className="text-zinc-500 text-xs leading-relaxed">{p.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Technical Details */}
                    {details && details.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></span>
                                Implementation Details
                            </h4>
                            <div className="bg-white/[0.02] rounded-2xl p-2 border border-white/5">
                                {details.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition rounded-lg">
                                        <span className="text-zinc-400 text-xs font-medium">{d.label}</span>
                                        <span className="text-emerald-400/90 text-xs font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
