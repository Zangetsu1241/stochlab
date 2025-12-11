"use client";

import React, { useState } from 'react';
import HeatSimulation from '../components/HeatSimulation';

import OptionPricing from '../components/OptionPricing';
import DeltaHedging from '../components/DeltaHedging';
import WaveSimulation from '../components/WaveSimulation';
import ReactionDiffusion from '../components/ReactionDiffusion';
import MonteCarloContainer from '../components/MonteCarloContainer';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'heat' | 'pricing' | 'hedging' | 'wave' | 'reaction' | 'monte_carlo'>('heat');

  return (
    <div className="flex flex-col h-screen bg-black text-white selection:bg-teal-500/30">
      {/* Header - Glassmorphic */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <span className="font-bold text-white text-lg">S</span>
          </div>
          <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-200 to-blue-200">StochLab</span>
          <span className="text-[10px] text-zinc-600 font-mono ml-4">DEBUG: {activeTab}</span>
        </div>

        {/* Tab Navigation */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('heat')}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${activeTab === 'heat' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.2)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
            >
              Heat Eq
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${activeTab === 'pricing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
            >
              Pricing
            </button>
            <button
              onClick={() => setActiveTab('hedging')}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${activeTab === 'hedging' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
            >
              Hedging
            </button>
            <button
              onClick={() => setActiveTab('wave')}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${activeTab === 'wave' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
            >
              Wave Eq
            </button>
            <button
              onClick={() => setActiveTab('reaction')}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${activeTab === 'reaction' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
            >
              Patterns
            </button>
            <button
              onClick={() => setActiveTab('monte_carlo')}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${activeTab === 'monte_carlo' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
            >
              Monte Carlo
            </button>
          </div>
        </div>

        {/* User Auth */}
        <div className="flex items-center gap-4">
          {!user ? (
            <button
              onClick={() => setIsLoginOpen(true)}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg border border-white/5 transition"
            >
              Login
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-zinc-400 hidden sm:block">{user.username}</span>
              </div>
              <button
                onClick={logout}
                className="text-xs text-zinc-500 hover:text-white transition underline"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* Content Area - Filling remaining height */}
      <main className="flex-1 relative overflow-hidden pt-16">
        {/* We keep components mounted but hidden to preserve state */}
        <div className={activeTab === 'heat' ? 'h-full w-full block' : 'hidden'}>
          <HeatSimulation isActive={activeTab === 'heat'} />
        </div>
        <div className={activeTab === 'pricing' ? 'h-full w-full block' : 'hidden'}>
          <OptionPricing isActive={activeTab === 'pricing'} />
        </div>
        <div className={activeTab === 'hedging' ? 'h-full w-full block' : 'hidden'}>
          <DeltaHedging isActive={activeTab === 'hedging'} />
        </div>
        <div className={activeTab === 'wave' ? 'h-full w-full block' : 'hidden'}>
          <WaveSimulation isActive={activeTab === 'wave'} />
        </div>
        <div className={activeTab === 'reaction' ? 'h-full w-full block' : 'hidden'}>
          <ReactionDiffusion isActive={activeTab === 'reaction'} />
        </div>
        <div className={activeTab === 'monte_carlo' ? 'h-full w-full block' : 'hidden'}>
          <MonteCarloContainer isActive={activeTab === 'monte_carlo'} />
        </div>
      </main>
    </div>
  );
}
