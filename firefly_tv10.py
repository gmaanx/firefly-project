"""
TV10 - Nguyen Tien Tai
Firefly Algorithm (FA) - Demo cho:
  Phan 1: Co che tu dong phan dan phu (Automatic Sub-swarming) trong toi uu da cuc tri
  Phan 2: Ket luan & Huong phat trien (do phuc tap O(n^2), self-adaptive, hybrid)

Cong thuc goc (Yang & Slowik, Chuong 13):
    x_i^{t+1} = x_i^t + beta0 * exp(-gamma * r_ij^2) * (x_j^t - x_i^t) + alpha * eps
    beta(r)   = beta0 * exp(-gamma * r^2)
    gamma = 1 / L^2 ;  alpha = alpha0 * theta^t

Chay:  python firefly_tv10.py          (chay ca 4 demo, luu anh vao thu muc ./results)
Yeu cau: numpy, matplotlib
"""
import os
import time
import numpy as np
import matplotlib

matplotlib.use("Agg")  # luu anh ra file, khong can mo cua so
import matplotlib.pyplot as plt

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
os.makedirs(OUT_DIR, exist_ok=True)


# ----------------------------------------------------------------------------
# Ham muc tieu
# ----------------------------------------------------------------------------
def himmelblau(x):
    """Ham da cuc tri: 4 cuc tieu toan cuc bang nhau (f = 0) trong [-5, 5]^2."""
    return (x[0] ** 2 + x[1] - 11) ** 2 + (x[0] + x[1] ** 2 - 7) ** 2


HIMMELBLAU_MINIMA = np.array([
    [3.0, 2.0],
    [-2.805118, 3.131312],
    [-3.779310, -3.283186],
    [3.584428, -1.848126],
])


def sphere(x):
    """Ham don cuc tri, dung de xem toc do hoi tu."""
    return float(np.sum((x - 1.0) ** 2))


# ----------------------------------------------------------------------------
# Firefly Algorithm
# ----------------------------------------------------------------------------
def firefly(f, lb, ub, n=50, t_max=150, alpha0=0.5, beta0=1.0, gamma=1.0,
            theta=0.97, adaptive_alpha=True, adaptive_gamma=False,
            seed=0, record=False):
    """
    FA chuan (minimize). Moi cap (i, j): neu j sang hon i thi i bay ve phia j.

    adaptive_alpha : alpha = alpha0 * theta^t  (giam dan, Eq. 13.7)
    adaptive_gamma : tang gamma theo thoi gian (self-adaptive) de dan chia ro hon
    record         : luu lai lich su quan the & best moi the he
    """
    rng = np.random.default_rng(seed)
    lb, ub = np.asarray(lb, float), np.asarray(ub, float)
    d = lb.size
    scale = np.abs(ub - lb)

    pop = lb + (ub - lb) * rng.random((n, d))
    light = np.array([f(p) for p in pop])

    history, best_curve = [], []
    alpha = alpha0
    for t in range(t_max):
        if adaptive_alpha:
            alpha = alpha0 * theta ** t
        g = gamma * (1 + 4 * t / t_max) if adaptive_gamma else gamma

        for i in range(n):
            for j in range(n):                       # O(n^2) cap so sanh
                if light[j] < light[i]:              # j sang hon i (minimize)
                    r2 = np.sum((pop[i] - pop[j]) ** 2)
                    beta = beta0 * np.exp(-g * r2)   # beta(r) giam theo khoang cach
                    step = alpha * (rng.random(d) - 0.5) * scale
                    pop[i] = pop[i] + beta * (pop[j] - pop[i]) + step
                    pop[i] = np.clip(pop[i], lb, ub)
                    light[i] = f(pop[i])

        best_curve.append(light.min())
        if record:
            history.append(pop.copy())

    k = np.argmin(light)
    return pop, light, pop[k].copy(), light[k], np.array(best_curve), history


# ----------------------------------------------------------------------------
# Phat hien cac dan phu (sub-swarms) sau khi chay
# ----------------------------------------------------------------------------
def detect_subswarms(pop, light, eps=0.6, min_size=3):
    """
    Gom cac dom dom thanh dan phu bang 'connected components' theo khoang cach eps.
    Tra ve danh sach (tam_dan, so_ca_the, f_tot_nhat, chi_so_cac_ca_the).
    """
    n = len(pop)
    dist = np.linalg.norm(pop[:, None, :] - pop[None, :, :], axis=2)
    adj = dist < eps
    label = -np.ones(n, dtype=int)
    cur = 0
    for s in range(n):
        if label[s] != -1:
            continue
        stack = [s]
        label[s] = cur
        while stack:
            u = stack.pop()
            for v in np.where(adj[u] & (label == -1))[0]:
                label[v] = cur
                stack.append(v)
        cur += 1

    swarms = []
    for c in range(cur):
        idx = np.where(label == c)[0]
        if len(idx) >= min_size:
            b = idx[np.argmin(light[idx])]
            swarms.append((pop[b].copy(), len(idx), light[b], idx))
    swarms.sort(key=lambda s: s[2])
    return swarms


# ----------------------------------------------------------------------------
# DEMO 1: beta(r) = beta0 * exp(-gamma r^2) cho cac gamma khac nhau
# ----------------------------------------------------------------------------
def demo_attractiveness():
    r = np.linspace(0, 6, 300)
    plt.figure(figsize=(6, 4))
    for g in [0.01, 0.1, 1.0, 5.0]:
        plt.plot(r, np.exp(-g * r ** 2), label=f"gamma = {g}")
    plt.xlabel("khoang cach r")
    plt.ylabel("beta(r) / beta0")
    plt.title("Do hap dan giam theo khoang cach")
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "1_beta_vs_distance.png"), dpi=130)
    plt.close()
    print("[Demo 1] Da luu 1_beta_vs_distance.png")


# ----------------------------------------------------------------------------
# DEMO 2: Tu dong phan dan phu tren ham Himmelblau
# ----------------------------------------------------------------------------
def demo_subswarming():
    lb, ub = [-5, -5], [5, 5]
    # gamma nho -> tam nhin xa -> ca quan the hoi tu ve 1 diem
    # gamma lon -> tam nhin ngan -> quan the tu chia thanh nhieu dan phu
    # Luu y: alpha0 phai nho (0.05); neu qua lon (vd 0.3) buoc ngau nhien se pha vo
    # cac dan phu va quan the bi keo ve 1 cuc tri.
    gammas = [0.01, 1.0]
    fig, axes = plt.subplots(2, len(gammas), figsize=(11, 9))

    xs = np.linspace(-5, 5, 300)
    X, Y = np.meshgrid(xs, xs)
    Z = (X ** 2 + Y - 11) ** 2 + (X + Y ** 2 - 7) ** 2

    for col, g in enumerate(gammas):
        pop0, *_ = firefly(himmelblau, lb, ub, n=60, t_max=0, gamma=g, seed=1)
        pop, light, best, fbest, _, _ = firefly(
            himmelblau, lb, ub, n=60, t_max=120, alpha0=0.05, gamma=g, seed=1)
        swarms = detect_subswarms(pop, light, eps=0.6, min_size=3)

        print(f"\n[Demo 2] gamma = {g}: phat hien {len(swarms)} dan phu")
        found = 0
        for k, (c, size, fv, _) in enumerate(swarms, 1):
            dmin = np.min(np.linalg.norm(HIMMELBLAU_MINIMA - c, axis=1))
            hit = dmin < 0.3 and fv < 1e-2
            found += hit
            print(f"   dan {k}: tam=({c[0]:+.3f}, {c[1]:+.3f}) | {size:2d} ca the | "
                  f"f={fv:.4f} | {'KHOP cuc tri' if hit else 'khong khop'}")
        print(f"   => tim duoc {found}/4 cuc tri toan cuc")

        for row, (p, ttl) in enumerate([(pop0, "ban dau (t=0)"),
                                        (pop, "sau 120 the he")]):
            ax = axes[row, col]
            ax.contour(X, Y, Z, levels=np.logspace(-0.5, 3.2, 25), cmap="Greys", alpha=0.6)
            ax.scatter(*HIMMELBLAU_MINIMA.T, marker="o", s=420, facecolors="none",
                       edgecolors="red", linewidths=1.5, label="4 cuc tieu", zorder=2)
            ax.scatter(p[:, 0], p[:, 1], s=22, c="tab:orange", edgecolors="k",
                       linewidths=0.4, zorder=3)
            ax.set_title(f"gamma={g}: {ttl}")
            ax.set_xlim(-5, 5); ax.set_ylim(-5, 5)
            if row == 1 and col == 0:
                ax.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "2_subswarming_himmelblau.png"), dpi=130)
    plt.close()
    print("[Demo 2] Da luu 2_subswarming_himmelblau.png")


# ----------------------------------------------------------------------------
# DEMO 3: Do phuc tap O(n^2) moi the he
# ----------------------------------------------------------------------------
def demo_complexity():
    ns = [10, 20, 40, 80, 160]
    times = []
    for n in ns:
        t0 = time.perf_counter()
        firefly(sphere, [-5] * 5, [5] * 5, n=n, t_max=5, seed=0)
        times.append((time.perf_counter() - t0) / 5)
    slope = np.polyfit(np.log(ns), np.log(times), 1)[0]
    print("\n[Demo 3] Thoi gian / the he:")
    for n, t in zip(ns, times):
        print(f"   n={n:4d}: {t * 1000:8.2f} ms")
    print(f"   He so doc log-log ~ {slope:.2f}  (ly thuyet = 2 => O(n^2))")

    plt.figure(figsize=(6, 4))
    plt.loglog(ns, times, "o-", label=f"do thuc te (doc ~ {slope:.2f})")
    ref = np.array(ns, float) ** 2 * times[0] / ns[0] ** 2
    plt.loglog(ns, ref, "--", label="O(n^2) tham chieu")
    plt.xlabel("so dom dom n"); plt.ylabel("thoi gian / the he (s)")
    plt.title("Do phuc tap tinh toan cua FA")
    plt.legend(); plt.grid(alpha=0.3, which="both")
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "3_complexity.png"), dpi=130)
    plt.close()
    print("[Demo 3] Da luu 3_complexity.png")


# ----------------------------------------------------------------------------
# DEMO 4: Tham so co dinh vs Self-adaptive vs Hybrid (FA + Local Search)
# ----------------------------------------------------------------------------
def local_search(f, x, lb, ub, iters=200, step=0.05, seed=0):
    """Hill-climbing Gaussian don gian de tinh chinh nghiem tot nhat."""
    rng = np.random.default_rng(seed)
    best, fb = x.copy(), f(x)
    for _ in range(iters):
        cand = np.clip(best + rng.normal(0, step, best.size), lb, ub)
        fc = f(cand)
        if fc < fb:
            best, fb = cand, fc
    return best, fb


def demo_adaptive_hybrid():
    d, lb, ub = 5, np.full(5, -5.0), np.full(5, 5.0)
    runs = 5
    cfg = {
        "FA tham so co dinh (alpha khong giam)": dict(adaptive_alpha=False),
        "Self-adaptive FA (alpha giam dan)": dict(adaptive_alpha=True),
    }
    plt.figure(figsize=(7, 4.5))
    print("\n[Demo 4] Hoi tu tren ham sphere 5 chieu (trung binh %d lan chay):" % runs)
    for name, kw in cfg.items():
        curves = [firefly(sphere, lb, ub, n=20, t_max=100, alpha0=0.5, gamma=0.1,
                          seed=s, **kw)[4] for s in range(runs)]
        mean = np.mean(curves, axis=0)
        plt.semilogy(mean + 1e-16, label=name)
        print(f"   {name}: f_cuoi = {mean[-1]:.3e}")

    # Hybrid: FA self-adaptive ngan + local search o cuoi
    hy = []
    for s in range(runs):
        _, _, b, fb, curve, _ = firefly(sphere, lb, ub, n=20, t_max=60, alpha0=0.5,
                                        gamma=0.1, seed=s)
        _, fl = local_search(sphere, b, lb, ub, iters=200, step=0.05, seed=s)
        hy.append(fl)
    print(f"   Hybrid FA(60 the he) + Local Search: f_cuoi = {np.mean(hy):.3e}")
    plt.axhline(np.mean(hy), ls="--", c="green", label="Hybrid FA + Local Search")

    plt.xlabel("the he"); plt.ylabel("f(best) - log")
    plt.title("Co dinh vs Self-adaptive vs Hybrid")
    plt.legend(); plt.grid(alpha=0.3, which="both")
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, "4_adaptive_hybrid.png"), dpi=130)
    plt.close()
    print("[Demo 4] Da luu 4_adaptive_hybrid.png")


if __name__ == "__main__":
    demo_attractiveness()
    demo_subswarming()
    demo_complexity()
    demo_adaptive_hybrid()
    print("\nXong! Xem anh trong thu muc:", OUT_DIR)
