---
name: timing
description: Interpolation and timing in Remotion—prefer interpolate with Bézier easing; springs as a specialized option
metadata:
  tags: easing, bezier, interpolation, spring, timing
---

**Default approach:** drive motion with `interpolate()` over explicit frame ranges and pass an easing function—especially **`Easing.bezier`**. The four parameters are the same as CSS `cubic-bezier(x1, y1, x2, y2)`, so you can copy curves from browser devtools, motion libraries, or editors like [cubic-bezier.com](https://cubic-bezier.com). That makes duration predictable, keeps key moments aligned to audio or edits, and avoids guessing spring mass/damping/stiffness.

`spring()` is still valid for bouncy, physics-like overshoot when you want that specific feel; it is just a weaker default for **timing design** because settle time is implicit and curves are harder to match to external specs or CSS.

A simple linear interpolation is done using the `interpolate` function.

```ts title="Going from 0 to 1 over 100 frames"
import { interpolate } from "remotion";

const opacity = interpolate(frame, [0, 100], [0, 1]);
```

By default, the values are not clamped, so the value can go outside the range [0, 1].  
Here is how they can be clamped:

```ts title="Going from 0 to 1 over 100 frames with extrapolation"
const opacity = interpolate(frame, [0, 100], [0, 1], {
  extrapolateRight: "clamp",
  extrapolateLeft: "clamp",
});
```

## Bézier easing (recommended)

Use `Easing.bezier(x1, y1, x2, y2)` inside the `interpolate` options object. The curve is identical in spirit to CSS animations and transitions, which helps when you are stealing timing from the web or from a designer’s spec.

```ts
import { interpolate, Easing } from "remotion";

const opacity = interpolate(frame, [0, 60], [0, 1], {
  easing: Easing.bezier(0.16, 1, 0.3, 1),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

### Examples (copy-paste curves)

**1. Crisp UI entrance (strong ease-out, no overshoot)** — slows nicely into the rest value; similar to many system “deceleration” curves.

```tsx
const enter = interpolate(frame, [0, 45], [0, 1], {
  easing: Easing.bezier(0.16, 1, 0.3, 1),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

**2. Editorial / slow fade (balanced ease-in-out)** — symmetric acceleration and deceleration over a hold-friendly move.

```tsx
const progress = interpolate(frame, [0, 90], [0, 1], {
  easing: Easing.bezier(0.45, 0, 0.55, 1),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

**3. Playful overshoot (control point y > 1)** — a little past the target then settles; use sparingly for emphasis.

```tsx
const pop = interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

## Preset easings (`Easing.in` / `Easing.out` / named curves)

Easing can be added to the `interpolate` function without a custom cubic:

```ts
import { interpolate, Easing } from "remotion";

const value1 = interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.inOut(Easing.cubic),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

The default easing is `Easing.linear`.  
Convexities:

- `Easing.in` — starting slow and accelerating
- `Easing.out` — starting fast and slowing down
- `Easing.inOut`

Named curves (from most linear to most curved):

- `Easing.quad`
- `Easing.cubic` (good default when you do not need a custom cubic)
- `Easing.sin`
- `Easing.exp`
- `Easing.circle`

### Easing direction for enter/exit animations

Use `Easing.out` for enter animations (starts fast, decelerates into place) and `Easing.in` for exit animations (starts slow, accelerates away). This feels natural because elements arrive with momentum and leave with gravity. When you need a specific curve from design, prefer a single `Easing.bezier(...)` instead of stacking presets.

## Composing interpolations

When multiple properties share the same timing (e.g. a slide-in panel and a video shift), avoid duplicating the full interpolation for each property. Instead, create a single normalized progress value (0 to 1) and derive each property from it:

```tsx
const slideIn = interpolate(
  frame,
  [slideInStart, slideInStart + slideInDuration],
  [0, 1],
  {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  },
);
const slideOut = interpolate(
  frame,
  [slideOutStart, slideOutStart + slideOutDuration],
  [0, 1],
  { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
);
const progress = slideIn - slideOut;

// Derive multiple properties from the same progress
const overlayX = interpolate(progress, [0, 1], [100, 0]);
const videoX = interpolate(progress, [0, 1], [0, -20]);
const opacity = interpolate(progress, [0, 1], [0, 1]);
```

The key idea: separate **timing** (when and how fast) from **mapping** (what values to animate between).

## Spring animations (specialized)

Spring animations model physical damping and stiffness; they read as organic and can overshoot without hand-tuning a Bézier past 1.

```ts title="Spring animation from 0 to 1"
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const scale = spring({
  frame,
  fps,
});
```

### Physical properties

The default configuration is: `mass: 1, damping: 10, stiffness: 100`.  
This leads to the animation having a bit of bounce before it settles.

The config can be overwritten like this:

```ts
const scale = spring({
  frame,
  fps,
  config: { damping: 200 },
});
```

The recommended configuration for a natural motion without a bounce is: `{ damping: 200 }`.

Here are some common configurations:

```tsx
const smooth = { damping: 200 }; // Smooth, no bounce (subtle reveals)
const snappy = { damping: 20, stiffness: 200 }; // Snappy, minimal bounce (UI elements)
const bouncy = { damping: 8 }; // Bouncy entrance (playful animations)
const heavy = { damping: 15, stiffness: 80, mass: 2 }; // Heavy, slow, small bounce
```

### Delay

The animation starts immediately by default.  
Use the `delay` parameter to delay the animation by a number of frames.

```tsx
const entrance = spring({
  frame: frame - ENTRANCE_DELAY,
  fps,
  delay: 20,
});
```

### Duration

A `spring()` has a natural duration based on the physical properties.  
To stretch the animation to a specific duration, use the `durationInFrames` parameter.

```tsx
const springValue = spring({
  frame,
  fps,
  durationInFrames: 40,
});
```

### Combining `spring()` with `interpolate()`

Map spring output (0–1) to custom ranges:

```tsx
const springProgress = spring({
  frame,
  fps,
});

const rotation = interpolate(springProgress, [0, 1], [0, 360]);

<div style={{ rotate: rotation + "deg" }} />;
```

### Adding springs

Springs return just numbers, so math can be performed:

```tsx
const frame = useCurrentFrame();
const { fps, durationInFrames } = useVideoConfig();

const inAnimation = spring({
  frame,
  fps,
});
const outAnimation = spring({
  frame,
  fps,
  durationInFrames: 1 * fps,
  delay: durationInFrames - 1 * fps,
});

const scale = inAnimation - outAnimation;
```

Use springs when the brief calls for **physics-like** motion; use **`interpolate` + `Easing.bezier`** when the brief calls for **designed** timing that should stay easy to tweak, document, and match elsewhere.
