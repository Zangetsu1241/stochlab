# backend/app/solvers/heat_fd.py
from __future__ import annotations
import numpy as np
from typing import Callable, List, Optional, Sequence, Union


def _init_condition(x: np.ndarray, kind: str = "pulse") -> np.ndarray:
    """
    Return initial condition u(x,0) as a 1D numpy array.

    kind:
      - "pulse": localized Gaussian pulse in center
      - "sin": single sine mode
      - "random": small random noise
    """
    if kind == "pulse":
        center = 0.5 * (x[0] + x[-1])
        width = 0.05 * (x[-1] - x[0]) or 0.05
        return np.exp(-((x - center) ** 2) / (2 * width**2))
    if kind == "sin":
        return np.sin(2 * np.pi * (x - x[0]) / (x[-1] - x[0]))
    if kind == "random":
        rng = np.random.default_rng(42)
        return 0.1 * rng.standard_normal(size=x.shape)
    raise ValueError(f"Unknown init kind: {kind}")


def solve_heat(
    *,
    alpha: float,
    dt: float,
    dx: float,
    t_steps: int,
    domain: float = 1.0,
    init: str = "pulse",
    init_state: Optional[List[float]] = None,
    bc: str = "dirichlet",
    sigma: float = 0.0,
    snapshot_interval: int = 1,
    return_as_list: bool = True,
    progress_callback: Optional[Callable[[int, int], None]] = None,
) -> Union[Dict[str, List], np.ndarray]:
    """
    Solve 1D heat equation using explicit finite differences.
    Returns dictionary with "frames" and "energy" if return_as_list=True.
        u^{n+1}_i = u^n_i + alpha * dt * (u^n_{i+1} - 2 u^n_i + u^n_{i-1}) / dx^2

    Parameters
    ----------
    alpha : float
        Diffusivity coefficient.
    dt : float
        Time step.
    dx : float
        Spatial grid spacing.
    t_steps : int
        Number of time steps to simulate.
    domain : float
        Length of spatial domain [0, domain].
    init : str
        Initial condition type: "pulse", "sin", "random". Ignored if init_state is provided.
    init_state : Optional[List[float]]
        Custom initial state array. If provided, overrides `init`.
    bc : str
        Boundary condition: "dirichlet" (u=0 at boundaries) supported.
    sigma : float
        Noise strength (volatility). If 0, deterministic.
    snapshot_interval : int
        Save every `snapshot_interval` time steps into frames.
    return_as_list : bool
        If True, return frames as nested Python lists for JSON serialization.
    progress_callback : Optional[callable]
        If provided, called as progress_callback(current_step, total_steps).

    Returns
    -------
    result : Dict or np.ndarray
        If return_as_list=True: {"frames": [...], "energy": [...]}
        Else: np.ndarray of frames
    """
    if dx <= 0 or dt <= 0:
        raise ValueError("dx and dt must be positive")
    if t_steps <= 0:
        raise ValueError("t_steps must be positive integer")

    # stability condition for explicit scheme: r = alpha * dt / dx**2 <= 1/2
    r = alpha * dt / (dx * dx)
    if r > 0.5:
        raise ValueError(
            f"Unstable parameters: CFL r = {r:.6f} > 0.5. "
            "Reduce dt or increase dx, or reduce alpha."
        )

    # build grid
    nx = int(np.floor(domain / dx)) + 1
    x = np.linspace(0.0, domain, nx)

    # initial condition
    if init_state is not None:
        if len(init_state) != nx:
             # Basic validation, though in a real app we might handle interpolation
             pass 
        u = np.array(init_state, dtype=float)
        # Verify shape
        if u.shape != x.shape:
             # If mismatch, re-interpolate or error? For MVP, let's just error or assume client sends correct size.
             # Actually, let's enforce size match to avoid crashes.
             if u.shape[0] != nx:
                  raise ValueError(f"init_state length {u.shape[0]} does not match domain/dx -> {nx}")
    else:
        u = _init_condition(x, kind=init).astype(float)
        
    # enforce boundary conditions (Dirichlet zero)
    if bc == "dirichlet":
        u[0] = 0.0
        u[-1] = 0.0
    else:
        raise ValueError("Only 'dirichlet' bc is supported for now")

    frames: List[np.ndarray] = []
    energy: List[float] = []
    if snapshot_interval <= 0:
        snapshot_interval = 1

    # pre-allocate next array
    u_next = np.zeros_like(u)

    # store initial frame
    frames.append(u.copy())
    energy.append(np.sum(u**2) * dx)

    for n in range(1, t_steps + 1):
        # interior points update
        # vectorized finite-difference
        u_next[1:-1] = (
            u[1:-1]
            + alpha * dt * (u[2:] - 2.0 * u[1:-1] + u[:-2]) / (dx * dx)
        )

        if sigma > 0.0:
            # Euler-Maruyama noise term: sigma * dW ~ sigma * sqrt(dt) * N(0,1)
            # Apply only to interior points? Physics often implies noise on the field itself.
            noise = sigma * np.sqrt(dt) * np.random.standard_normal(size=nx-2)
            u_next[1:-1] += noise

        # boundaries (dirichlet: zero)
        u_next[0] = 0.0
        u_next[-1] = 0.0

        # swap
        u, u_next = u_next, u

        # optionally save snapshot
        if (n % snapshot_interval) == 0:
            frames.append(u.copy())
            energy.append(np.sum(u**2) * dx)

        # progress callback
        if progress_callback is not None:
            progress_callback(n, t_steps)

    frames_arr = np.vstack(frames)  # shape (n_frames, nx)

    if return_as_list:
        return {
            "frames": frames_arr.tolist(),
            "energy": energy
        }
    return frames_arr
