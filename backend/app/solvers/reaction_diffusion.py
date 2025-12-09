import numpy as np

def solve_reaction_diffusion(
    Du: float,
    Dv: float,
    F: float,
    k: float,
    sigma: float,
    T: float,
    dt: float,
    dx: float,
    domain_len: float = 50.0,
    init_type: str = "random_center",
    width: int = 64, 
    height: int = 64,
    current_u: list[list[float]] = None,
    current_v: list[list[float]] = None
):
    """
    Solves the 2D Gray-Scott Reaction-Diffusion System with Noise:
    U_t = Du * Laplacian(U) - U*V^2 + F*(1 - U) + sigma * noise
    V_t = Dv * Laplacian(V) + U*V^2 - (F + k)*V + sigma * noise
    
    Using Explicit Finite Difference (Forward Euler).
    Note: Stable only for small dt. 
    """
    
    nx = width
    ny = height
    
    # Initialize fields
    U = np.ones((nx, ny))
    V = np.zeros((nx, ny))
    
    # State Resumption from Infinite Loop
    if current_u is not None and current_v is not None:
        # Convert list to numpy
        resume_u = np.array(current_u)
        resume_v = np.array(current_v)
        
        # Verify shape
        if resume_u.shape == (nx, ny) and resume_v.shape == (nx, ny):
            U = resume_u
            V = resume_v
        else:
            # If shape mismatch (e.g. res change), try to re-init or fail?
            # For simplicity, if mismatch, just re-init with pattern logic or clip?
            # Let's just follow init logic if resumption fails/mismatches for now.
            pass

    # Initial Conditions (Perturbation) - ONLY if not resuming
    elif init_type == "random_center":
        # Add random noise in center square to break symmetry
        cx, cy = nx // 2, ny // 2
        r = min(10, nx // 4, ny // 4) # Ensure r fits in grid
        r = max(1, r) # At least 1
        
        # Safe slicing
        x_start, x_end = max(0, cx-r), min(nx, cx+r)
        y_start, y_end = max(0, cy-r), min(ny, cy+r)
        
        # Adjust random shape to match slice
        u_noise = np.random.normal(0, 0.05, (x_end - x_start, y_end - y_start))
        v_noise = np.random.normal(0, 0.05, (x_end - x_start, y_end - y_start))
        
        U[x_start:x_end, y_start:y_end] = 0.5 + u_noise
        V[x_start:x_end, y_start:y_end] = 0.25 + v_noise
    elif init_type == "random_everywhere":
        U += np.random.normal(0, 0.05, (nx, ny))
        V += np.random.normal(0, 0.05, (nx, ny))
    elif init_type == "spots":
        # Multiple random spots
        for _ in range(10):
            rx, ry = np.random.randint(0, nx), np.random.randint(0, ny)
            U[rx-2:rx+2, ry-2:ry+2] = 0.5
            V[rx-2:rx+2, ry-2:ry+2] = 0.25
            
    # Clip to valid range [0, 1] mainly for stability, but let dynamics handle it mostly
    
    nt = int(T / dt)
    frames = []
    
    # Laplacian kernel (5-point stencil)
    # Using numpy roll for periodic BCs is fast and easy
    def laplacian(Z):
        return (
            np.roll(Z, 1, axis=0) + np.roll(Z, -1, axis=0) +
            np.roll(Z, 1, axis=1) + np.roll(Z, -1, axis=1) -
            4 * Z
        ) / (dx**2)

    # Sub-stepping? Explicit Euler for reaction-diffusion requires very small dt.
    # Gray-Scott typical parameters: Du=0.16, Dv=0.08, F=0.035, k=0.060.
    # Diffusive stability: D * dt / dx^2 < 0.25.
    # If dx=1.0, D=0.16 -> dt < 0.25/0.16 ~= 1.5. 
    # With user provided inputs, we might need check.
    
    # Precompute constants
    steps_per_frame = max(1, int(nt / 50)) # Limit output to ~50 frames max for 2D payload size
    
    history_U = []
    history_V = []
    
    t_vals = []
    
    accumulated_U = U.copy()
    accumulated_V = V.copy()
    
    for i in range(nt):
        Lu = laplacian(accumulated_U)
        Lv = laplacian(accumulated_V)
        
        # Reaction terms
        uv2 = accumulated_U * (accumulated_V ** 2)
        
        # Noise
        noise_u = np.zeros((nx, ny))
        noise_v = np.zeros((nx, ny))
        if sigma > 0:
            noise_u = np.random.normal(0, 1, (nx, ny)) * sigma * np.sqrt(dt)
            noise_v = np.random.normal(0, 1, (nx, ny)) * sigma * np.sqrt(dt)
        
        # Update
        # F(1-U) -> Feed
        # -(F+k)V -> Kill
        du = Du * Lu - uv2 + F * (1.0 - accumulated_U) + noise_u
        dv = Dv * Lv + uv2 - (F + k) * accumulated_V + noise_v
        
        accumulated_U += du * dt
        accumulated_V += dv * dt
        
        # Clip to prevent numerical blowup?
        # Gray-Scott is usually bounded [0,1], but noise can push it out.
        # Let's not hard clip unless requested, but check for NaNs.
        if np.any(np.isnan(accumulated_U)):
            raise ValueError("Simulation unstable (NaN values detected). Try smaller dt.")
            
        if i % steps_per_frame == 0:
            history_U.append(accumulated_U.tolist()) # Heavy payload? 64x64 float is small.
            # Only storing U usually suffices for visualization (V is inverse-ish)
            # But let's verify visual. U is "food", V is "eater". V forms the pattern usually.
            history_V.append(accumulated_V.tolist())
            t_vals.append(i * dt)
            
    return {
        "t": t_vals,
        "U": history_U,
        "V": history_V,
        "parameters": {"Du": Du, "Dv": Dv, "F": F, "k": k}
    }
