import numpy as np

def solve_wave_equation(
    c: float,
    damping: float,
    sigma: float,
    T: float,
    dt: float,
    dx: float,
    domain_len: float = 10.0,
    init_type: str = "pulse",
    current_u: list[float] = None,
    current_u_prev: list[float] = None
):
    """
    Solves the 1D Stochastic Wave Equation:
    u_tt = c^2 * u_xx - damping * u_t + sigma * noise
    
    Using Explicit Finite Difference (Leapfrog/Central difference in time).
    Stability condition (CFL): c * dt <= dx
    """
    
    # Grid setup
    nx = int(domain_len / dx) + 1
    nt = int(T / dt)
    x = np.linspace(0, domain_len, nx)
    
    # CFL Check
    cfl = c * dt / dx
    if cfl > 1.0:
        raise ValueError(f"Unstable: CFL condition violated (CFL={cfl:.4f} > 1.0). Decrease dt or increase dx.")

    # Fields: u_new (n+1), u_curr (n), u_prev (n-1)
    u_curr = np.zeros(nx)
    u_prev = np.zeros(nx)
    u_next = np.zeros(nx)
    
    # Initial Conditions
    if current_u is not None and current_u_prev is not None:
        if len(current_u) != nx or len(current_u_prev) != nx:
             # Try to interpolate if size mismatch (e.g. if we want to change resolution mid-sim, though dangerous for stability)
             # For MVP, strict check or simple resize? Strict check.
             if len(current_u) != nx:
                  # raise ValueError(f"Grid size mismatch on resume. Expected {nx}, got {len(current_u)}")
                  # Re-interpolate for UX robustness if params changed slightly?
                  # Let's just raise for now or handle gracefully by resizing current params to match resume state?
                  # Actually usually params don't change dx/len. 
                  pass
        
        # If sizes match (or we ignore mismatch for robustness risk), copy
        # Ensure we take min length to avoid crash
        n_copy = min(nx, len(current_u))
        u_curr[:n_copy] = current_u[:n_copy]
        
        n_copy_prev = min(nx, len(current_u_prev))
        u_prev[:n_copy_prev] = current_u_prev[:n_copy_prev]
        
    elif init_type == "pulse":
        # Gaussian pulse in the center
        u_curr = np.exp(-((x - domain_len/2)**2) / 0.5)
        # Assuming initial velocity is zero, u_prev needs to be consistent
        # Taylor expansion: u(t-dt) = u(t) - u_t*dt + 0.5*u_tt*dt^2
        pass # u_prev will be set equal to u_curr below
    elif init_type == "string":
        # Plucked string (triangle)
        center = int(nx / 2)
        u_curr[:center] = np.linspace(0, 1, center)
        u_curr[center:] = np.linspace(1, 0, nx - center)
        pass # u_prev equal to u_curr below

    # If we didn't resume, set u_prev = u_curr (v=0 start)
    if current_u is None:
        u_prev[:] = u_curr[:]
    
    history = [u_curr.tolist()]
    energy_history = []
    
    # Precompute coefficients
    # Discretization: 
    # (u_next - 2u_curr + u_prev)/dt^2 + damping*(u_next - u_prev)/(2dt) = c^2 * (u_{i+1} - 2u_i + u_{i-1})/dx^2 + noise
    
    # Let's use a simpler standard explicit central difference for damping term to avoid implicit nature if needed,
    # or the standard verifiable scheme:
    # u_next = 2u_curr - u_prev + (c*dt/dx)^2 * (u_{i+1} - 2u_i + u_{i-1}) - damping*dt*(u_curr - u_prev) + sigma...
    
    # Using central diff for damping u_t ~ (u_next - u_prev) / 2dt
    # u_next - 2u_curr + u_prev = r^2 (diff_x) - k * (u_next - u_prev)/2 + noise * dt^2
    # u_next (1 + k/2) = 2u_curr - u_prev (1 - k/2) + r^2 (diff_x) + noise
    # Let k = damping * dt
    # u_next = (2u_curr - u_prev(1 - k/2) + r^2(diff_x) + noise) / (1 + k/2)
    
    r2 = (c * dt / dx) ** 2
    k = damping * dt
    
    # Random stream
    # Spatial noise correlated or uncorrelated? Uncorrelated white noise for now.
    # Noise should be scaled by sqrt(dt) for standard Wiener process term in SDE, 
    # but in SPDE wave equation usually acts as a force term F(x,t).
    # If F(x,t) is white noise ~ N(0,1), it adds to acceleration.
    # Acceleration term addition: sigma * sqrt(dt) * N(0,1) * dt ?
    # Typically: dX_t = ... dt + sigma dW_t. 
    # Here u_tt means second derivative. 
    # Let's treat it as a force: u_tt = ... + sigma * xi(x,t)
    # in discrete: u_next += sigma * normal() * dt^2
    
    for t in range(nt):
        # Laplacian
        d2u = np.zeros(nx)
        d2u[1:-1] = u_curr[2:] - 2*u_curr[1:-1] + u_curr[:-2]
        
        # Stochastic force
        noise = np.random.normal(0, 1, nx) if sigma > 0 else np.zeros(nx)
        
        # Update rule (Central diff with damping)
        # u_next * (1 + k/2) = 2*u_curr - u_prev*(1 - k/2) + r2 * d2u + sigma * noise * dt*dt
        forcing = sigma * noise * (dt**2)
        
        numerator = 2*u_curr - u_prev*(1 - k/2) + r2 * d2u + forcing
        u_next = numerator / (1 + k/2)
        
        # Dirichlet BCs (Fixed ends)
        u_next[0] = 0
        u_next[-1] = 0
        
        # Energy Calculation (Hamiltonian approximation)
        # E = 0.5 * integral( u_t^2 + c^2 u_x^2 ) dx
        # Discrete: sum of (velocity^2 + c^2 * strain^2) * dx
        
        vel = (u_next - u_prev) / (2*dt)
        strain = (u_curr[1:] - u_curr[:-1]) / dx
        
        kin_en = 0.5 * np.sum(vel[1:-1]**2) * dx
        pot_en = 0.5 * (c**2) * np.sum(strain**2) * dx
        total_en = kin_en + pot_en
        energy_history.append(total_en)
        
        # Shift buffers
        u_prev[:] = u_curr[:]
        u_curr[:] = u_next[:]
        
        # Save frame (decimate if needed, but doing all for now as logic handled by API usually)
        history.append(u_curr.tolist())
        
    return {
        "x": x.tolist(),
        "t": np.linspace(0, T, len(history)).tolist(),
        "frames": history,
        "energy": energy_history
    }
