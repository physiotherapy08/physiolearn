# PhysioLearn film — sound design. Voice placed on the film timeline (unprocessed), SFX + bed synthesized in code.
import numpy as np, soundfile as sf, subprocess, json
SR = 48000
LEN = 228.0
N = int(LEN * SR)
rng = np.random.default_rng(7)

# ---- voice: decode at 48k, place with the two tutorial pauses ----
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', '/home/claude/film/audio/voice.mp3', '-ar', str(SR), '-ac', '1', '/home/claude/film/audio/voice48.wav'], check=True)
v, _ = sf.read('/home/claude/film/audio/voice48.wav', dtype='float32')
voice = np.zeros(N, np.float32)
def place(o0, o1, f0):
    a, b = int(o0 * SR), int(min(o1, len(v) / SR) * SR); d = int(f0 * SR)
    voice[d:d + (b - a)] = v[a:b]
place(0, 167.9, 1.5); place(167.9, 183.55, 173.4); place(183.55, 999, 191.05)

# ---- synth helpers ----
t_ = lambda d: np.arange(int(d * SR)) / SR
def envl(n, a=.005, r=.1):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr) ** 2; return e
def lp(x, k):  # one-pole low-pass, k in (0,1]
    y = np.empty_like(x); acc = 0.
    for i in range(len(x)): acc += k * (x[i] - acc); y[i] = acc
    return y
def tap_sfx():
    tt = t_(.06); s = np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 140) * .6 + rng.normal(0, 1, len(tt)) * np.exp(-tt * 260) * .25
    return s
def tick_sfx():
    tt = t_(.025); return np.sin(2 * np.pi * 3200 * tt) * np.exp(-tt * 300) * .25
def whoosh(d=.55, up=True):
    n = int(d * SR); x = rng.normal(0, 1, n)
    ks = np.linspace(.008, .07, n) if up else np.linspace(.07, .008, n)
    y = np.empty(n); acc = 0.
    for i in range(n): acc += ks[i] * (x[i] - acc); y[i] = acc
    y2 = np.empty(n); acc = 0.
    for i in range(n): acc += ks[i] * (y[i] - acc); y2[i] = acc
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    return y2 * e * 4.2
def impact(d=1.4):
    tt = t_(d); f = 55 * np.exp(-tt * 3) + 38
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.2) * .9
    s += lp(rng.normal(0, 1, len(tt)), .08) * np.exp(-tt * 9) * .8
    return s
def pop():
    tt = t_(.12); return np.sin(2 * np.pi * (600 + 900 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 30) * .45
def chime(f=880, d=2.2):
    tt = t_(d); s = sum(np.sin(2 * np.pi * f * m * tt) * a for m, a in [(1, 1), (2.01, .35), (3.0, .15), (4.2, .07)])
    return s * np.exp(-tt * 2.2) * envl(len(tt), .004, .3) * .32
def riser(d=1.6):
    n = int(d * SR); x = rng.normal(0, 1, n); ks = np.linspace(.01, .12, n)
    y = np.empty(n); acc = 0.
    for i in range(n): acc += ks[i] * (x[i] - acc); y[i] = acc
    tt = np.arange(n) / SR; tone = np.sin(2 * np.pi * np.cumsum(np.linspace(200, 900, n)) / SR) * .25
    return (y * 1.2 + tone) * np.linspace(0, 1, n) ** 2
sfx = np.zeros(N)
def add(sig, at, g=1.):
    i = int(at * SR); j = min(N, i + len(sig)); sfx[i:j] += sig[:j - i] * g

# ---- placements (film seconds) ----
TAPS = [55.55, 59.05, 69.0, 74.0, 79.4, 81.3, 83.6, 85.05, 86.45, 87.6, 90.2, 95.2, 97.6, 99.2, 124.25,
        160.0, 163.35, 164.25, 167.0, 169.9, 171.6, 176.45, 180.6, 183.95, 189.2, 191.95]
for x in TAPS: add(tap_sfx(), x, .55)
SWAPS = [55.95, 59.45, 68.3, 69.4, 74.4, 78.7, 79.8, 81.7, 84.0, 88.0, 90.6, 93.4, 95.6, 98.0, 99.6, 109.3, 120.6, 124.6, 126.4, 129.4,
         160.25, 164.45, 167.35, 170.35, 171.85, 176.75, 180.85, 184.3, 190.0, 192.25]
for x in SWAPS: add(whoosh(.35), x - .05, .10)
for x in [55.19, 68.37, 78.96, 93.56, 109.46, 120.5, 157.52, 173.4]: add(whoosh(.7), x - .25, .22)  # chapter changes
for x in [9.2, 36.2, 52.6, 138.9, 154.4, 198.9, 207.0, 214.9]: add(whoosh(.9, False), x - .2, .2)  # scene changes
# hook: elements gather -> logo impact
add(riser(1.4), .25, .35); add(impact(), 1.66, .7); add(chime(660, 2.6), 1.7, .5)
# key words: big whoosh + low impact; silent beat before the climax word
for x in [5.75, 7.75, 33.4, 46.13, 113.75, 38.35]: add(whoosh(.5), x - .4, .22); add(impact(1.0), x, .45)
add(whoosh(.6), 212.0, .35); add(impact(1.5), 212.44, .7)
for i in range(4): add(pop(), 17.6 + i * .45, .5)          # question marks
for i in range(4): add(pop(), 21.3 + i * .18, .3)           # concept chips
for x in [59.99, 63.11, 64.61, 85.43, 87.96, 89.53, 126.32, 129.42, 131.51]: add(pop(), x, .28)  # feature chips
for i in range(3): add(pop(), 136.2 + i * .25, .35)        # sync ticks
add(impact(1.2), 148.35, .4); add(pop(), 148.35, .4)        # icon lands on the home screen
for a, b in [(160.6, 161.7), (177.0, 178.1)]:               # typing the link
    for x in np.arange(a, b, .07): add(tick_sfx(), x + rng.uniform(-.01, .01), .5)
for c in range(4):                                         # tired url typing loop
    for x in np.arange(139.5 + c * 1.7, 139.5 + c * 1.7 + 1.19, .09): add(tick_sfx(), x, .35)
add(chime(990, 1.6), 172.45, .35); add(chime(990, 1.6), 192.85, .35)   # app opens
add(whoosh(.9), 218.5, .12); add(impact(1.6), 219.1, .25); add(chime(523.25, 3.0), 219.1, .22)

# ---- music bed: soft pad chord progression + gentle pulse ----
tt = np.arange(N) / SR
chords = [[220.0, 277.18, 329.63], [196.0, 246.94, 293.66], [174.61, 220.0, 261.63], [196.0, 246.94, 329.63]]
bed = np.zeros(N)
seg = 4.0
for k in range(int(LEN / seg) + 1):
    a = int(k * seg * SR); b = min(N, int((k + 1) * seg * SR) + int(.8 * SR))
    if a >= N: break
    ts = np.arange(b - a) / SR; ch = chords[k % 4]
    s = sum(np.sin(2 * np.pi * f * ts) * .5 + np.sin(2 * np.pi * f * 2.003 * ts) * .12 for f in ch)
    e = np.minimum(1, ts / 1.2) * np.minimum(1, (len(ts) / SR - ts) / .9)
    bed[a:b] += s * e
pulse = (np.sin(2 * np.pi * 2.0 * tt) * .5 + .5) ** 6 * np.sin(2 * np.pi * 110 * tt) * .35
bed = bed * .08 + pulse * .05 * np.clip((212 - tt) / 3, 0, 1)
# shimmer layer for the brand + closing
sh = sum(np.sin(2 * np.pi * f * tt) for f in [880, 1108.7, 1318.5]) * .02
# (shimmer removed: the sustained high tones were harsh at the end)
# after the narration ends the bed is no longer ducked, so bring it down to a soft tail
bed *= 1 - .62 * np.clip((tt - 216.5) / 2.5, 0, 1)
# silent beat before the climax word, fade in/out
bed *= 1 - .85 * np.clip(1 - np.abs(tt - 212.15) / .35, 0, 1)
bed *= np.clip(tt / 1.5, 0, 1) * np.clip((LEN - tt) / 2.5, 0, 1)
# duck under the voice (envelope follower)
lvl = np.abs(voice); win = int(.12 * SR)
envv = np.convolve(lvl, np.ones(win) / win, 'same'); envv = envv / (envv.max() + 1e-9)
duck = 1 - .55 * np.clip(envv * 6, 0, 1)
duck = np.convolve(duck, np.ones(int(.25 * SR)) / int(.25 * SR), 'same')
mixd = voice * 1.0 + bed * duck * 1.0 + sfx * .5 * (1 - .35 * np.clip(envv * 6, 0, 1))
peak = np.abs(mixd).max(); mixd = mixd / max(peak, 1) * .95 if peak > .95 else mixd
sf.write('/home/claude/film/audio/mix.wav', mixd.astype(np.float32), SR)
sf.write('/home/claude/film/audio/sfx_only.wav', (sfx * .5).astype(np.float32), SR)
print('mix ok', round(peak, 3))
