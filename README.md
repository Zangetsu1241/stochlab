# StochLab: Interactive Stochastic Simulation Platform

StochLab is a high-performance web application for visualizing and interacting with stochastic differential equations (SDEs) and partial differential equations (PDEs) in real-time. Designed for quant researchers and students, it provides a unified dashboard for simulation, pricing, risk management, and uncertainty quantification.

![StochLab Dashboard](https://via.placeholder.com/800x400?text=StochLab+Dashboard+Preview) 
*(Note: Replace with actual screenshot)*

## 🚀 Features

### 🔐 User & History System
- **Authentication**: Secure JWT-based Login and Registration.
- **Simulation History**: Automatically save your simulation parameters to your personal account (currently available for select solvers like Heat Equation and GBM).
- **One-Click Restore**: Reload any saved simulation state instantly to resume analysis.

### 1. Stochastic Heat Equation
- **Real-Time PDE Solver**: Finite-difference solution to $\frac{\partial u}{\partial t} = \alpha \nabla^2 u + \sigma \dot{W}$.
- **Interactive Controls**: Modify diffusion ($\alpha$), volatility ($\sigma$), and damping in real-time.
- **Energy Diagnostics**: Live tracking of system energy ($L^2$ norm) to verify stability and conservation.
- **Infinite Mode**: Continuous simulation loop for long-running pattern observation.

### 2. Reaction-Diffusion (Gray-Scott)
- **Pattern Formation**: Simulate complex biological patterns like skin spots and stripes.
- **Turing Instability**: Explorer for the diverse phase space of the Gray-Scott model.
- **Dynamic Parameters**: Adjust Feed (F) and Kill (k) rates on the fly to morph patterns.

### 3. Stochastic Wave Equation
- **Wave Propagation**: Simulates 1D waves in a noisy medium ($\frac{\partial^2 u}{\partial t^2} = c^2 \nabla^2 u + \sigma \dot{W}$).
- **Energy Conservation**: Visualizes the interplay between Kinetic and Potential energy.
- **Interference**: Observe how noise interacting with reflections creates standing wave patterns.

### 4. Geometric Brownian Motion (GBM)
- **Monte Carlo Simulator**: Parallelized generation of thousands of asset price paths.
- **Visual Analytics**: Interactive multi-path plotting with color-coded final results.
- **Statistics**: Instant calculation of expected value and path distribution.

### 5. Option Pricing (Black-Scholes)
- **Real-Time Calculator**: Instant pricing for European Calls and Puts.
- **Greeks Dashboard**: Visual cards for Delta, Gamma, Theta, Vega, and Rho.
- **Interactive Payoff**: Dynamic "Hockey Stick" diagram visualizing intrinsic vs. time value.

### 6. Dynamic Delta Hedging
- **Trading Simulator**: Simulates a trader hedging an option portfolio over its life.
- **PnL Attribution**: Visualizes the P&L variance caused by discrete rebalancing (slippage).
- **Exposure Tracking**: Live chart of Delta exposure vs. Stock price movement.

### 7. Uncertainty Quantification (UQ)
- **Parameter Sweeps**: Analyze how uncertainty in input parameters (e.g., Volatility) affects outcomes.
- **Dual Models**: Run UQ on both GBM paths and Black-Scholes pricing simultaneously.
- **Risk Metrics**: Calculate Value at Risk (VaR) and confidence intervals from thousands of scenarios.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Plotly.js
- **Backend**: FastAPI (Python), NumPy, SciPy, SQLAlchemy
- **Database**: SQLite (for User Auth & History)
- **Security**: OAuth2 with Password Flow (JWT), BCrypt Hashing
- **Architecture**: REST API with optimized JSON payloads for time-series data.

## 📦 Installation

### Prerequisites
- Node.js 18+
- Python 3.10+

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```
*Backend runs on http://localhost:8000*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on http://localhost:3000*

### 3. Usage
1.  Open [http://localhost:3000](http://localhost:3000).
2.  **Sign Up** for an account to enable History features.
3.  Select a simulation from the top navigation bar.
4.  Adjust parameters in the **Left Sidebar** to control the simulation.
5.  Click **Start** or **Run Analysis** to execute.
6.  Use the **History Panel** (right side) to save/load scenarios (where available).

## 🔍 Directory Structure

```
stochlab/
├── backend/
│   ├── app/
│   │   ├── api/          # API Routers (auth, history, solvers...)
│   │   ├── core/         # Config & Security
│   │   ├── models/       # Database Models (User, SimulationHistory)
│   │   ├── solvers/      # Numerical Engines (Finite Diff, Monte Carlo)
│   │   └── main.py       # App Entry Point
│   └── stochlab.db       # SQLite Database
└── frontend/
    ├── app/              # Next.js Pages & Layout
    ├── components/       # React Simulation & UI Components
    ├── context/          # Global State (AuthContext)
    └── lib/              # API Client & Config
```

## 🧪 Testing

Run the backend test suite to verify solvers:
```bash
cd backend
pytest
```

## 📝 Future Roadmap
- [ ] **Extend Simulation History** to all solvers (Reaction-Diffusion, Wave, Pricing, Hedging, UQ)
- [ ] Stochastic Volatility Models (Heston)
- [ ] Jump Diffusion Process (Merton)
- [ ] 3D Surface Volatility Visualization
- [ ] WebSocket integration for lower latency streaming

---
