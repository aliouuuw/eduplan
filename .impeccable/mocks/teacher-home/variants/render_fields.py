# Renders the authored backdrops for the glass tests at 2x (2880 x 3200).
# Usage: python3 -I render_fields.py   -> ../backgrounds/soie.jpg, dunes.jpg, jardin-base.txt
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "backgrounds")
W, H = 2880, 3200
rng = np.random.default_rng(7)

def palette(t, stops):
    """Map t in [0,1] through (pos, (r,g,b)) stops."""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (t >= p0) & (t <= p1)
        k = ((t - p0) / (p1 - p0))[m][:, None]
        out[m] = np.array(c0) * (1 - k) + np.array(c1) * k
    return out

def shade(h, light, scale):
    gy, gx = np.gradient(h)
    n = np.dstack([-gx * scale, -gy * scale, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    l = np.array(light, float); l /= np.linalg.norm(l)
    diff = np.clip((n * l).sum(2), 0, 1)
    half = (l + np.array([0, 0, 1.0])); half /= np.linalg.norm(half)
    spec = np.clip((n * half).sum(2), 0, 1) ** 40
    return diff, spec

def grain(img, amount):
    g = rng.normal(0, amount, img.shape[:2])[..., None]
    return img + g

def save(img, name):
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name), quality=88, optimize=True, progressive=True)

y, x = np.mgrid[0:H, 0:W].astype(np.float32)
u, v = x / W, y / W  # same unit on both axes

# Soie: long diagonal folds with a slow warp, one teal family, warm specular.
wu = u + 0.09 * np.sin(2.4 * v + 0.7) + 0.04 * np.sin(6.1 * v + 2.0)
wv = v + 0.07 * np.sin(2.3 * u + 1.9)
h = (0.50 * np.sin(8.4 * wu + 4.6 * wv) + 0.32 * np.sin(13.1 * wu + 2.2 * wv + 1.4)
     + 0.18 * np.sin(21.0 * wu + 6.5 * wv + 0.3))
diff, spec = shade(h, (-0.55, -0.75, 0.6), 520)
t = 0.15 + 0.75 * diff
t -= 0.22 * np.clip(1 - v / 0.45, 0, 1)  # darker at the top: white greeting stays AA
img = palette(t, [(0, (8, 34, 38)), (.35, (22, 76, 78)), (.62, (58, 128, 120)), (.85, (150, 190, 172)), (1, (214, 226, 210))])
img += spec[..., None] * np.array([240, 196, 150]) * 0.55
save(grain(img, 3.2), "soie.jpg")

# Dunes: desert from above, ridges with sharp crests, raking light from the left.
du = u + 0.11 * np.sin(2.7 * v + 0.4) + 0.04 * np.sin(7.9 * v + 1.3)
dv = v + 0.08 * np.sin(2.1 * u + 1.1)
ridge = lambda f, a, ph: 1 - np.abs(np.sin(f * (du * 0.6 + dv) + a * np.sin(2.2 * du) + ph))
h = 0.62 * ridge(5.2, 1.6, 0) ** 2.2 + 0.28 * ridge(8.9, 1.1, 1.7) ** 1.8 + 0.10 * ridge(23.0, 0.7, 0.9)
diff, _ = shade(h, (-0.9, -0.25, 0.5), 260)
t = 0.22 + 0.74 * diff
t -= 0.25 * np.clip(1 - v / 0.4, 0, 1)
img = palette(t, [(0, (70, 40, 34)), (.3, (136, 76, 52)), (.55, (190, 118, 76)), (.8, (232, 182, 132)), (1, (248, 224, 190))])
save(grain(img, 3.0), "dunes.jpg")

# Jardin: report the tone of the painting's bottom rows, used to continue the page below it.
j = np.asarray(Image.open(os.path.join(OUT, "nature.jpg")).convert("RGB"), float)
base = j[-40:].reshape(-1, 3).mean(0)
deep = base * 0.62
open(os.path.join(OUT, "jardin-base.txt"), "w").write("#%02x%02x%02x #%02x%02x%02x\n" % (*base.astype(int), *deep.astype(int)))
print("ok", "jardin base", base.astype(int), "deep", deep.astype(int))
