---
name: resend-design
description: Design system skill for resend. Activate when building UI components, pages, or any visual elements. Provides exact color tokens, typography scale, spacing grid, component patterns, and craft rules. Read references/DESIGN.md before writing any CSS or JSX.
---

# resend Design System

You are building UI for **resend**. Light-themed, cool palette, monospace typography (inter), compact density on a 4px grid, expressive motion.

## Visual Reference

**IMPORTANT**: Study ALL screenshots below before writing any UI. Match colors, typography, spacing, layout, and motion exactly as shown.

### Homepage

![resend Homepage](screenshots/homepage.png)

> Read `references/DESIGN.md` for full token details.

## Design Philosophy

- **Layered depth** — use shadow tokens to create a sense of physical layering. Each elevation level has a specific shadow.
- **Gradient accents** — gradients are used thoughtfully for emphasis, not decoration.
- **Single typeface** — inter carries all text. Hierarchy comes from size, weight, and color — never font mixing.
- **compact density** — 4px base grid. Every dimension is a multiple of 4.
- **cool palette** — the color temperature runs cool, matching the monospace typography.
- **Restrained accent** — `#62ffb3` is the only pop of color. Used exclusively for CTAs, links, focus rings, and active states.
- **Expressive motion** — animations are an integral part of the experience. Use spring physics and layout animations.

## Color System

### Core Palette

| Role | Token | Hex | Use |
|------|-------|-----|-----|
| Background | `--background` | `#ffffff` | Page/app background |
| Surface | `--surface` | `#f1f5f9` | Cards, panels, modals |
| Text Primary | `--text-primary` | `#000000` | Headings, body text |
| Text Muted | `--text-muted` | `#a0a0a0` | Captions, placeholders |
| Accent | `--accent` | `#62ffb3` | CTAs, links, focus rings |
| Border | `--border` | `#505050` | Dividers, card borders |

### Status Colors

| Status | Hex | Use |
|--------|-----|-----|
| Success | `#22c55e` | Confirmations, positive trends |
| Warning | `#9c6b2e` | Caution states, pending items |

### Extended Palette

- **color-gray-200:** `#e8e8e8` — Light surface or highlight color
- `#ababab`
- **color-light-gray-7:** `#6c6c6c`
- **color-light-gray-12:** `#1b1b1b` — Deep background layer or shadow color
- `#8f8f8f`
- **color-zinc-950:** `#101010` — Deep background layer or shadow color
- `#323232`
- `#212629`

### CSS Variable Tokens

```css
--color-background: var(--background);
--animate-disco-border: disco 6s linear infinite;
--color-background: var(--gray-2);
--highlight-border: var(--green-a8);
--highlight-border: var(--orange-a8);
--highlight-border: var(--red-a8);
--highlight-border: var(--violet-a8);
--color-background: var(--background);
--bg-accent: var(--color-black);
--bg-accent-hover: var(--black-a11);
--ring-accent: var(--black-a4);
--text-on-accent: var(--color-white);
--bg-accent: var(--color-white);
--bg-accent-hover: var(--gray-12);
--ring-accent: var(--gray-a4);
--text-on-accent: var(--color-black);
--background: #fdfdfd;
--ai-border-speed: 3s;
--background: #000;
--color-background: var(--gray-2);
```

## Typography

### Font Stack

- **inter** — Heading 1, Heading 2, Heading 3
- **SFMono-Regular** — Body, Caption, Code

### Font Sources

```css
@font-face {
  font-family: "inter";
  src: url("fonts/inter-100.woff2") format("woff2");
  font-weight: 100;
}
@font-face {
  font-family: "aBCFavorit";
  src: url("fonts/aBCFavorit-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "domaine";
  src: url("fonts/domaine-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "domaine";
  src: url("fonts/domaine-700.woff2") format("woff2");
  font-weight: 700;
}
@font-face {
  font-family: "commitMono";
  src: url("fonts/commitMono-Regular.woff2") format("woff2");
  font-weight: 400;
}
```

### Type Scale

| Role | Family | Size | Weight |
|------|--------|------|--------|
| Heading 1 | inter | 160px | 700 |
| Heading 2 | inter | 9rem | 700 |
| Heading 3 | inter | 140px | 700 |
| Body | SFMono-Regular | var(--text-sm,.875rem) | 400 |
| Caption | SFMono-Regular | var(--text-xs,.75rem) | 400 |
| Code | SFMono-Regular | 14px | 400 |

### Typography Rules

- All text uses **inter** — never add another font family
- Max 3-4 font sizes per screen
- Headings: weight 600-700, body: weight 400
- Use color and opacity for text hierarchy, not additional font sizes
- Line height: 1.5 for body, 1.2 for headings

## Spacing & Layout

### Base Grid: 4px

Every dimension (margin, padding, gap, width, height) must be a multiple of **4px**.

### Spacing Scale

`2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24` px

### Spacing as Meaning

| Spacing | Use |
|---------|-----|
| 4-8px | Tight: related items (icon + label, avatar + name) |
| 12-16px | Medium: between groups within a section |
| 24-32px | Wide: between distinct sections |
| 48px+ | Vast: major page section breaks |

### Border Radius

Scale: `.125rem, .25rem, .2813rem, .5rem, .62rem, .625rem, 1rem, 1.3rem, 1.625rem, 1.75rem, 1.875rem, 2px, 2rem, 2.25rem, 3rem, 4rem, 4px, 6px, 8px, 9px, 12px, 14px, 15px, 16px, 18px, 20px, 22px, 24px, 26px, 30px, 32px, 50dvw, inherit, 100%`
Default: `6px`

### Container

Max-width: `92rem`, centered with auto margins.

### Breakpoints

| Name | Value |
|------|-------|
| sm | 40rem |
| md | 48rem |
| lg | 64rem |
| xl | 80rem |
| 2xl | 96rem |
| xs | 375px |
| md | 767px |
| lg | 1000px |
| xl | 1160px |
| 2xl | 1340px |
| 2xl | 1920px |

Mobile-first: design for small screens, layer on responsive overrides.

## Component Patterns

### Card

```css
.card {
  background: #f1f5f9;
  border: 1px solid #505050;
  border-radius: 6px;
  padding: 16px;
  box-shadow: 0 .25rem 1.25rem .125rem #0000002e;
}
```

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>
```

### Button

```css
/* Primary */
.btn-primary {
  background: #62ffb3;
  color: #000000;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 500;
  transition: opacity 150ms ease;
}
.btn-primary:hover { opacity: 0.9; }

/* Ghost */
.btn-ghost {
  background: transparent;
  border: 1px solid #505050;
  color: #000000;
  border-radius: 6px;
  padding: 8px 16px;
}
```

```html
<button class="btn-primary">Get Started</button>
<button class="btn-ghost">Learn More</button>
```

### Input

```css
.input {
  background: #ffffff;
  border: 1px solid #505050;
  border-radius: 6px;
  padding: 8px 12px;
  color: #000000;
  font-size: 14px;
}
.input:focus { border-color: #62ffb3; outline: none; }
```

```html
<input class="input" type="text" placeholder="Search..." />
```

### Badge / Chip

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: #f1f5f9;
  color: #a0a0a0;
}
```

```html
<span class="badge">New</span>
<span class="badge">Beta</span>
```

### Modal / Dialog

```css
.modal-backdrop { background: rgba(0, 0, 0, 0.6); }
.modal {
  background: #f1f5f9;
  border: 1px solid #505050;
  border-radius: 100%;
  padding: 24px;
  max-width: 480px;
  width: 90vw;
  box-shadow: inset -1px -1px 4px 3px #00000040,inset 1px 1px 4px #ffffff1a,inset 8px -8px 16px -8px #00000014,inset 16px -16px 16px -16px #00000040;
}
```

```html
<div class="modal-backdrop">
  <div class="modal">
    <h2>Dialog Title</h2>
    <p>Dialog content.</p>
    <button class="btn-primary">Confirm</button>
    <button class="btn-ghost">Cancel</button>
  </div>
</div>
```

### Table

```css
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  padding: 8px 12px;
  font-weight: 500;
  font-size: 12px;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #505050;
}
.table td {
  padding: 12px;
  border-bottom: 1px solid #505050;
}
```

```html
<table class="table">
  <thead><tr><th>Name</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>
    <tr><td>Item One</td><td>Active</td><td>Jan 1</td></tr>
    <tr><td>Item Two</td><td>Pending</td><td>Jan 2</td></tr>
  </tbody>
</table>
```

### Navigation

```css
.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #505050;
}
.nav-link {
  color: #a0a0a0;
  padding: 8px 12px;
  border-radius: 6px;
  transition: color 150ms;
}
.nav-link:hover { color: #000000; }
.nav-link.active { color: #62ffb3; }
```

```html
<nav class="nav">
  <a href="/" class="nav-link active">Home</a>
  <a href="/about" class="nav-link">About</a>
  <a href="/pricing" class="nav-link">Pricing</a>
  <button class="btn-primary" style="margin-left: auto">Get Started</button>
</nav>
```

### Extracted Components

These components were found in the codebase:

**Button** (`html`)
- Variants: `.png&quot;)]`

**Input** (`html`)

**Navigation** (`html`)

**Footer** (`html`)

## Page Structure

The following page sections were detected:

- **Hero** — Hero/banner section with headline and CTAs
- **Footer** — Page footer with links and info (2 items)
- **Cta** — Call-to-action section
- **Faq** — FAQ/accordion section

When building pages, follow this section order and structure.

## Animation & Motion

This project uses **expressive motion**. Animations are part of the design language.

### CSS Animations

- `spin`
- `ping`
- `pulse`
- `ai-shimmer-text`
- `scroll-x`

### Motion Tokens

- **Duration scale:** `0s`, `0ms`, `.1s`, `.15s`, `.2s`, `.25s`, `.3s`, `.35s`, `.36s`, `.4s`, `.45s`, `.5s`, `.6s`, `.7s`, `1s`, `1.8s`, `20ms`, `30s`, `50ms`, `75ms`, `80ms`, `100ms`, `120ms`, `150ms`, `160ms`, `200ms`, `240ms`, `300ms`, `360ms`, `400ms`
- **Easing functions:** `cubic-bezier(.3,1,.66,1)`, `cubic-bezier(.6,.12,.34,.96)`, `cubic-bezier(.16,1,.3,1)`, `cubic-bezier(.25,.46,.45,.94)`, `cubic-bezier(.36,.66,.6,1)`, `cubic-bezier(.42,0,.58,1.8)`, `cubic-bezier(.075,.82,.165,1)`, `cubic-bezier(.77,0,.175,1)`, `cubic-bezier(.215,.61,.355,1)`, `cubic-bezier(.645,.045,.355,1)`, `cubic-bezier(0,.24,.54,1)`, `cubic-bezier(.4,0,.2,1)`, `cubic-bezier(.22,1,.36,1)`, `cubic-bezier(.32,.72,0,1)`, `cubic-bezier(.87,0,.13,1)`, `linear`, `ease`, `cubic-bezier(.66,.06,.36,.96)`, `cubic-bezier(.36,.66,.6,.96)`, `cubic-bezier(.19,1,.22,1)`, `ease-out`, `cubic-bezier(.45,.05,.55,.95)`, `ease-in-out`
- **Animated properties:** `max-height`

### Motion Guidelines

- **Duration:** Use values from the duration scale above. Short (0s) for micro-interactions, long (400ms) for page transitions
- **Easing:** Use `cubic-bezier(.3,1,.66,1)` as the default easing curve
- **Direction:** Elements enter from bottom/right, exit to top/left
- **Reduced motion:** Always respect `prefers-reduced-motion` — disable animations when set

## Depth & Elevation

### Shadow Tokens

- Subtle: `0-1px #0000`
- Subtle: `0-1px 0 0 var(--scroll-shadow-line-color)`
- Subtle: `0-1px 0 0 transparent,0 1px 0 0 var(--scroll-shadow-line-color)`
- Subtle: `0-1px 0 0 var(--scroll-shadow-line-color),0 1px 0 0 var(--scroll-shadow-line-color)`
- Subtle: `0-1px 0 0 var(--scroll-shadow-line-color),0 1px 0 0 transparent`
- Subtle: `0 0 0 2px #61a8f8`

### Z-Index Scale

`0, 1, 2, 3, 5, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99, 100, 101, 110, 999, 1000, 9999, 99999`

Use these exact values — never invent z-index values.

## Anti-Patterns (Never Do)

- **No blur effects** — no backdrop-blur, no filter: blur()
- **No zebra striping** — tables and lists use borders for separation
- **No invented colors** — every hex value must come from the palette above
- **No arbitrary spacing** — every dimension is a multiple of 4px
- **No extra fonts** — only inter and SFMono-Regular are allowed
- **No arbitrary border-radius** — use the scale: .125rem, .25rem, .2813rem, .5rem, .62rem, .625rem, 1rem, 1.3rem, 1.625rem, 1.75rem
- **No opacity for disabled states** — use muted colors instead

## Workflow

1. **Read** `references/DESIGN.md` before writing any UI code
2. **Pick colors** from the Color System section — never invent new ones
3. **Set typography** — inter, SFMono-Regular only, using the type scale
4. **Build layout** on the 4px grid — check every margin, padding, gap
5. **Match components** to patterns above before creating new ones
6. **Apply elevation** — use shadow tokens
7. **Validate** — every value traces back to a design token. No magic numbers.

## Brand Spec

- **Favicon:** `/static/favicons/favicon-marketing.ico`
- **Site URL:** `https://resend.com/`
- **Brand color:** `#62ffb3`
- **Brand typeface:** inter

## Quick Reference

```
Background:     #ffffff
Surface:        #f1f5f9
Text:           #000000 / #a0a0a0
Accent:         #62ffb3
Border:         #505050
Font:           inter
Spacing:        4px grid
Radius:         6px
Components:     8 detected
```

## When to Trigger

Activate this skill when:
- Creating new components, pages, or visual elements for resend
- Writing CSS, Tailwind classes, styled-components, or inline styles
- Building page layouts, templates, or responsive designs
- Reviewing UI code for design consistency
- The user mentions "resend" design, style, UI, or theme
- Generating mockups, wireframes, or visual prototypes

---

# Full Reference Files

> Every output file is embedded below. Claude has full design system context from /skills alone.

## Design System Tokens (DESIGN.md)

# resend DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: None detected
> Colors: 20 · Fonts: 2 · Components: 8
> Icon library: not detected · State: not detected
> Primary theme: light · Dark mode toggle: no · Motion: expressive

## Visual Reference

**Match this design exactly** — study colors, fonts, spacing, and component shapes before writing any UI code.

![resend Homepage](../screenshots/homepage.png)

---

## 1. Visual Theme & Atmosphere

This is a **light-themed** interface with a cool, approachable feel. The light background emphasizes content clarity. Typography uses **inter** throughout — a technical, developer-focused choice that maintains consistency. Spacing follows a **4px base grid** (compact density), with scale: 2, 4, 6, 8, 10, 12, 14, 16px. The palette is predominantly monochromatic with **#62ffb3** as the single accent color — used sparingly for interactive elements and emphasis. Motion is expressive — spring physics, layout animations, and staggered reveals are part of the visual language.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| tw-ring-offset-color | `#ffffff` | background | Page background, darkest surface |
| color-slate-100 | `#f1f5f9` | surface | Card and panel backgrounds |
| theme-color | `#000000` | text-primary | Headings and body text |
| color-zinc-400 | `#a0a0a0` | text-muted | Captions, placeholders, secondary info |
| border | `#505050` | border | Dividers, card borders, outlines |
| accent | `#62ffb3` | accent | CTAs, links, focus rings, active states |
| tw-ring-color | `#22c55e` | success | Success states, positive indicators |
| warning | `#9c6b2e` | warning | Warning states, caution indicators |
| color-gray-200 | `#e8e8e8` | unknown | Palette color |
| unknown | `#ababab` | unknown | Palette color |
| color-light-gray-7 | `#6c6c6c` | unknown | Palette color |
| color-light-gray-12 | `#1b1b1b` | unknown | Palette color |
| unknown | `#8f8f8f` | unknown | Palette color |
| color-zinc-950 | `#101010` | unknown | Palette color |
| unknown | `#323232` | unknown | Palette color |
| unknown | `#212629` | unknown | Palette color |
| color-gray-500 | `#6a7282` | unknown | Palette color |
| color-neutral-300 | `#d4d4d4` | unknown | Palette color |
| unknown | `#c8c8c8` | unknown | Palette color |
| color-green-500 | `#00c758` | unknown | Palette color |

### CSS Variable Tokens

```css
--tw-border-spacing-x: 0;
--tw-border-spacing-y: 0;
--tw-border-style: solid;
--color-background: var(--background);
--animate-disco-border: disco 6s linear infinite;
--tw-border-spacing-x: calc(var(--spacing)*0);
--tw-border-spacing-y: calc(var(--spacing)*0);
--tw-border-style: none;
--tw-border-style: dashed;
--tw-border-style: dotted;
--tw-border-style: none;
--tw-border-style: none;
--tw-border-style: solid;
--color-background: var(--gray-2);
--highlight-border: var(--green-a8);
--highlight-border: var(--orange-a8);
--highlight-border: var(--red-a8);
--highlight-border: var(--violet-a8);
--tw-border-style: none;
--tw-border-style: none;
```


---

## 3. Typography Rules

**Font Stack:**
- **inter** — Heading 1, Heading 2, Heading 3
- **SFMono-Regular** — Body, Caption, Code

**Font Sources:**

```css
@font-face {
  font-family: "inter";
  src: url("fonts/inter-100.woff2") format("woff2");
  font-weight: 100;
}
@font-face {
  font-family: "aBCFavorit";
  src: url("fonts/aBCFavorit-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "domaine";
  src: url("fonts/domaine-Regular.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "domaine";
  src: url("fonts/domaine-700.woff2") format("woff2");
  font-weight: 700;
}
@font-face {
  font-family: "commitMono";
  src: url("fonts/commitMono-Regular.woff2") format("woff2");
  font-weight: 400;
}
```

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | inter | 160px | 700 |
| Heading 2 | inter | 9rem | 700 |
| Heading 3 | inter | 140px | 700 |
| Body | SFMono-Regular | var(--text-sm,.875rem) | 400 |
| Caption | SFMono-Regular | var(--text-xs,.75rem) | 400 |
| Code | SFMono-Regular | 14px | 400 |

**Typographic Rules:**
- Use **inter** for all text — do not mix font families
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

### Layout (1)

**Footer** — `html`

### Navigation (1)

**Navigation** — `html`

### Data Display (1)

**Badge** — `html`

### Data Input (2)

**Button** — `html`
- Variants: `.png&quot;)]`
- Animation: 

**Input** — `html`
- State: :focus, :placeholder

### Overlay (1)

**Modal** — `html`

### Media (2)

**Image** — `html`

**Icon** — `html`



---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24
- **Border radius:** .125rem, .25rem, .2813rem, .5rem, .62rem, .625rem, 1rem, 1.3rem, 1.625rem, 1.75rem, 1.875rem, 2px, 2rem, 2.25rem, 3rem, 4rem, 4px, 6px, 8px, 9px, 12px, 14px, 15px, 16px, 18px, 20px, 22px, 24px, 26px, 30px, 32px, 50dvw, inherit, 100%
- **Max content width:** 92rem

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 4-8px | Tight: related items within a group |
| 12-16px | Medium: between groups |
| 24-32px | Wide: between sections |
| 48px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Flat — subtle depth hints

- `0-1px #0000`
- `0-1px 0 0 var(--scroll-shadow-line-color)`
- `0-1px 0 0 transparent,0 1px 0 0 var(--scroll-shadow-line-color)`

### Raised — cards, buttons, interactive elements

- `0 .25rem 1.25rem .125rem #0000002e`
- `0 0 4rem .5rem #ffffff0b,0 0 1rem .375rem #ffffff03`
- `inset 0 0 0 .0625rem #ffffff1a`

### Floating — dropdowns, popovers, modals

- `inset -1px -1px 4px 3px #00000040,inset 1px 1px 4px #ffffff1a,inset 8px -8px 16px -8px #00000014,inset 16px -16px 16px -16px #00000040`
- `inset -1px -1px 4px 3px #00000059,inset 1px 1px 4px #ffffff59,inset 8px -8px 16px -8px #00000014,inset 16px -16px 16px -16px #00000040`
- `20px 20px 20px #0003`

### Overlay — full-screen overlays, top-level dialogs

- `0-2px 40px #00000010`
- `0 0 40px 10px #00000040`

### Z-Index Scale

`0, 1, 2, 3, 5, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99, 100, 101, 110, 999, 1000, 9999, 99999`



---

## 7. Animation & Motion

This project uses **expressive motion**. Animations are an integral part of the experience.

### CSS Animations

- `@keyframes spin`
- `@keyframes ping`
- `@keyframes pulse`
- `@keyframes ai-shimmer-text`
- `@keyframes scroll-x`
- `@keyframes shine`
- `@keyframes disco`
- `@keyframes fade-in`

### Animated Components

- **Button**: 

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#62ffb3` for interactive elements (buttons, links, focus rings)
- Use `#ffffff` as the primary page background
- Use **inter** for all UI text
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: .125rem, .25rem, .2813rem, .5rem, .62rem
- Reuse existing components from Section 4 before creating new ones

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't mix font families — use inter consistently
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't use backdrop-blur or blur effects

### Anti-Patterns (detected from codebase)

- No blur or backdrop-blur effects
- No zebra striping on tables/lists


---

## 9. Responsive Behavior

| Name | Value | Source |
|---|---|---|
| sm | 40rem | css |
| md | 48rem | css |
| lg | 64rem | css |
| xl | 80rem | css |
| 2xl | 96rem | css |
| xs | 375px | css |
| md | 767px | css |
| lg | 1000px | css |
| xl | 1160px | css |
| 2xl | 1340px | css |
| 2xl | 1920px | css |

**Approach:** Use `@media (min-width: ...)` queries matching the breakpoints above.


---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #f1f5f9
Border: 1px solid #505050
Radius: 6px
Padding: 16px
Font: inter
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg #62ffb3, text white
Ghost: bg transparent, border #505050
Padding: 8px 16px
Radius: 6px
Hover: opacity 0.9 or lighter shade
Focus: ring with #62ffb3
```

### Build a Page Layout

```
Background: #ffffff
Max-width: 92rem, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #f1f5f9
Label: #a0a0a0 (muted, 12px, uppercase)
Value: #000000 (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #ffffff
Input border: 1px solid #505050
Focus: border-color #62ffb3
Label: #a0a0a0 12px
Spacing: 16px between fields
Radius: 6px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: inter, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```

## Bundled Fonts (fonts/)

The following font files are bundled in the `fonts/` directory:

- `fonts/aBCFavorit-500.woff2`
- `fonts/aBCFavorit-Regular.woff2`
- `fonts/commitMono-Regular.woff2`
- `fonts/domaine-500.woff2`
- `fonts/domaine-700.woff2`
- `fonts/domaine-Regular.woff2`
- `fonts/inter-100.woff2`

Use these local font files in `@font-face` declarations instead of fetching from Google Fonts.

## Homepage Screenshots (screenshots/)

![homepage.png](screenshots/homepage.png)

