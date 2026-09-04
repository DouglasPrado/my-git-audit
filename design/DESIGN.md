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
  src: url("https://resend.com/_next/static/immutable/media/inter_variable.p.2v4uvb3i5caxn.woff2") format("woff2");
  font-weight: 100;
}
@font-face {
  font-family: "aBCFavorit";
  src: url("https://resend.com/_next/static/immutable/media/abc_favorit_book.p.2svqvtuar83ra.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "domaine";
  src: url("https://resend.com/_next/static/immutable/media/domaine_regular.p.2joc-huu8rdu_.woff2") format("woff2");
  font-weight: 400;
}
@font-face {
  font-family: "domaine";
  src: url("https://resend.com/_next/static/immutable/media/domaine_bold.p.3n2td7ookua-p.woff2") format("woff2");
  font-weight: 700;
}
@font-face {
  font-family: "commitMono";
  src: url("https://resend.com/_next/static/immutable/media/commit_mono_regular.p.17ccpk27lq6an.woff2") format("woff2");
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
