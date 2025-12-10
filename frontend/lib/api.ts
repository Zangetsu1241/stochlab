import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export type HeatInput = {
    alpha: number;
    dt: number;
    dx: number;
    t_steps: number;
    domain: number;
    init: "pulse" | "sin" | "random";
    current_state?: number[];
    sigma: number;
    snapshot_interval: number;
};

export type HeatResponse = {
    frames: number[][];
    energy: number[];
};



export type GBMInput = {
    S0: number;
    mu: number;
    sigma: number;
    T: number;
    dt: number;
    n_paths: number;
};

export type GBMResponse = {
    time: number[];
    paths: number[][];
};

export type PricingInput = {
    S: number;
    K: number;
    T: number;
    r: number;
    sigma: number;
    option_type: "call" | "put";
};

export type PricingResponse = {
    price: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
};

export type HedgingInput = {
    S0: number;
    K: number;
    T: number;
    r: number;
    sigma: number;
    mu: number;
    option_type: "call" | "put";
    rebalance_freq: "daily" | "weekly";
};

export type HedgingResponse = {
    time: number[];
    stock_price: number[];
    option_price: number[];
    delta: number[];
    pnl: number[];
};

export type WaveInput = {
    c: number;
    damping: number;
    sigma: number;
    T: number;
    dt: number;
    dx: number;
    domain_len: number;
    init_type: "pulse" | "string";
    current_u?: number[];
    current_u_prev?: number[];
};

export type WaveResponse = {
    x: number[];
    t: number[];
    frames: number[][];
    energy: number[];
};

export const solveHeatEquation = async (params: HeatInput): Promise<HeatResponse> => {
    try {
        const response = await axios.post<HeatResponse>(`${API_BASE_URL}/heat/solve`, params);
        return response.data;
    } catch (error) {
        console.error("API Call failed:", error);
        throw error;
    }
};

export const solveGBM = async (params: GBMInput): Promise<GBMResponse> => {
    try {
        const response = await axios.post<GBMResponse>(`${API_BASE_URL}/gbm/simulate`, params);
        return response.data;
    } catch (error) {
        console.error("GBM API Call failed:", error);
        throw error;
    }
};

export const calculatePrice = async (params: PricingInput): Promise<PricingResponse> => {
    try {
        const response = await axios.post<PricingResponse>(`${API_BASE_URL}/pricing/black-scholes`, params);
        return response.data;
    } catch (error) {
        console.error("Pricing API Call failed:", error);
        throw error;
    }
};

export const simulateHedging = async (params: HedgingInput): Promise<HedgingResponse> => {
    try {
        const response = await axios.post<HedgingResponse>(`${API_BASE_URL}/hedging/simulate`, params);
        return response.data;
    } catch (error) {
        console.error("Hedging API Call failed:", error);
        throw error;
    }
};

export const solveWave = async (params: WaveInput): Promise<WaveResponse> => {
    try {
        const response = await axios.post<WaveResponse>(`${API_BASE_URL}/wave/simulate`, params);
        return response.data;
    } catch (error) {
        console.error("Wave API Call failed:", error);
        throw error;
    }
};

export type ReactionInput = {
    F: number;
    k: number;
    Du: number;
    Dv: number;
    sigma: number;
    dt: number;
    dx: number;
    T: number;
    width: number;
    height: number;
    init_type: "random_center" | "random_everywhere" | "spots" | "center" | "random";
    current_u?: number[][];
    current_v?: number[][];
};

export type ReactionResponse = {
    u: number[][][]; // Note: Backend returns U (uppercase), Axios/JSON might preserve case.
    v: number[][][]; // Backend returns V. 
    // Wait, backend uses "U" and "V". Frontend defines `u` and `v` lowercase?
    // Let's check `ReactionDiffusion.tsx` usage. It used `res.U` (uppercase) in finding?
    // In `ReactionDiffusion.tsx`: `setHistoryU(res.U)`.
    // So the TYPE here in api.ts was `u: number[][]` which was creating confusion or mismatch?
    // Actually, backend returns `U`, `V`.
    // Valid JSON: { "U": [...], "V": [...] }
    // So the type should be U and V.
    U: number[][][];
    V: number[][][];
    t: number[];
};

export const solveReaction = async (params: ReactionInput): Promise<ReactionResponse> => {
    try {
        const response = await axios.post<ReactionResponse>(`${API_BASE_URL}/reaction/simulate`, params);
        return response.data;
    } catch (error) {
        console.error("Reaction API Call failed:", error);
        throw error;
    }
};

export type UQInput = {
    model_type: "gbm" | "pricing";
    n_sims: number;
    base_params: any;
    param_ranges: { [key: string]: { min: number, max: number } };
};

export type UQResponse = {
    stats: {
        mean: number;
        std: number;
        min: number;
        max: number;
        var_95: number;
        var_99: number;
    };
    histogram: {
        counts: number[];
        bins: number[];
    };
    timing: number;
};

export const solveUQ = async (params: UQInput): Promise<UQResponse> => {
    try {
        const response = await axios.post<UQResponse>(`${API_BASE_URL}/uq/simulate`, params);
        return response.data;
    } catch (error) {
        console.error("UQ API Call failed:", error);
        throw error;
    }
};
