import type { Layout } from 'plotly.js';

export const PREMIUM_CHART_LAYOUT: Partial<Layout> = {
    autosize: true,
    plot_bgcolor: 'transparent',
    paper_bgcolor: 'transparent',
    font: {
        family: 'Inter, sans-serif',
        size: 11,
        color: '#a1a1aa'
    },
    xaxis: {
        gridcolor: '#27272a',
        zerolinecolor: '#27272a',
        showgrid: false,
        showline: true,
        linecolor: '#27272a',
        tickfont: { color: '#71717a' }
    },
    yaxis: {
        gridcolor: '#27272a',
        zerolinecolor: '#27272a',
        showgrid: true,
        tickfont: { color: '#71717a' }
    },
    margin: { t: 40, r: 20, l: 40, b: 40 },
    hovermode: "x unified",
    showlegend: false
};

export const PREMIUM_CHART_CONFIG = {
    displayModeBar: false,
    responsive: true
};

export const CHART_COLORS = {
    primary: '#2dd4bf',   // teal-400
    secondary: '#3b82f6', // blue-500
    accent: '#f59e0b',    // amber-500
    danger: '#f43f5e',    // rose-500
    success: '#10b981',   // emerald-500
    grid: '#27272a'       // zinc-800
};
