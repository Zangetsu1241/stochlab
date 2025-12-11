"use client";

import React, { useState } from 'react';
import GBMSimulation from './GBMSimulation';
import MonteCarloUQ from './MonteCarloUQ';

interface MonteCarloContainerProps {
    isActive: boolean;
}

export default function MonteCarloContainer({ isActive }: MonteCarloContainerProps) {
    const [subTab, setSubTab] = useState<'paths' | 'uq'>('paths');

    return (
        <div className="flex flex-col h-full w-full">
            {/* Sub-navigation Header */}
            <div className="h-12 bg-black/40 border-b border-white/10 flex items-center justify-center shrink-0 backdrop-blur-md z-20">
                <div className="flex bg-white/5 p-1 rounded-full border border-white/5">
                    <button
                        onClick={() => setSubTab('paths')}
                        className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${subTab === 'paths'
                            ? 'bg-violet-500/20 text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.3)] border border-violet-500/30'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Path Simulation (GBM)
                    </button>
                    <button
                        onClick={() => setSubTab('uq')}
                        className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${subTab === 'uq'
                            ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] border border-amber-500/30'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Uncertainty (UQ)
                    </button>
                </div>
            </div>

            {/* Content Content - Pass isActive only to the visible one if we want to mount/unmount or hide */}
            {/* We keep both mounted to preserve state, but visibility is toggled */}
            <div className="flex-1 relative overflow-hidden">
                <div className={subTab === 'paths' ? 'h-full w-full block animate-in fade-in duration-300' : 'hidden'}>
                    <GBMSimulation isActive={isActive && subTab === 'paths'} />
                </div>
                <div className={subTab === 'uq' ? 'h-full w-full block animate-in fade-in duration-300' : 'hidden'}>
                    <MonteCarloUQ isActive={isActive && subTab === 'uq'} />
                </div>
            </div>
        </div>
    );
}
