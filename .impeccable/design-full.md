---
name: Family Christmas Wishlist
description: Warm holiday cardstock design system combining cream and peach surfaces, pine-green actions, and cranberry status accents.
colors:
  cream: "#fff8f0"
  peach: "#ffdec3"
  peach-soft: "#fff0e2"
  surface: "#ffffff"
  surface-subtle: "#fcf4ea"
  ink: "#101010"
  ink-muted: "#5c4b43"
  ink-on-peach: "#46332b"
  pine: "#008042"
  pine-hover: "#006835"
  pine-soft: "#e7f5ed"
  pine-ink: "#005c2f"
  cranberry: "#c73213"
  cranberry-hover: "#a7270d"
  cranberry-soft: "#fdece8"
  cranberry-ink: "#9f230a"
  border-warm: "#ead4c0"
  border-strong: "#d8baa0"
typography:
  display:
    fontFamily: "Figtree, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Figtree, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Figtree, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Figtree, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0em"
rounded:
  nested: "12px"
  card: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.pine}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.pine-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  button-cranberry:
    backgroundColor: "{colors.cranberry}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.nested}"
    padding: "12px 15px"
    height: "48px"
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  badge-pine:
    backgroundColor: "{colors.pine-soft}"
    textColor: "{colors.pine-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  badge-cranberry:
    backgroundColor: "{colors.cranberry-soft}"
    textColor: "{colors.cranberry-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
---

# Design System: Family Christmas Wishlist

## Overview

**Creative North Star: "The Holiday Cardstock Ledger"**

Family Christmas Wishlist treats gift coordination like an inviting, tactile holiday greeting card rather than a spreadsheet or dark novelty widget. Warm cream cardstock (`#fff8f0`) grounds the entire experience so relatives reading on phones or laptops feel calm clarity, while warm peach-cream headers (`#ffdec3`) and crisp snow-white gift cards (`#ffffff`) establish immediate hierarchy.

Every interactive control follows a restraint-first Operate pattern: clear labels paired with unmistakable semantic color cues—pine green (`#008042`) exclusively for forward gift and picking actions, cranberry red (`#c73213`) for claimed/locked status and destructive confirmation. No decorative kickers, nested cards, or modal clutter interrupt the single-column flow.

**Key Characteristics:**
- Warm cream and peach cardstock palette with deep charcoal (`#101010`) typography.
- Single-column centered layout (`34rem` max width) built for effortless mobile touch and clean desktop parity.
- Self-hosted variable Figtree typography with fixed `rem` hierarchy and `tabular-nums` on counts and sign-in codes.
- Text status labels paired with visual cues (`Already picked`, `You picked this`, `Wishlist coming soon`) so status is never communicated by color or strike-through alone.

## Colors

Warm tinted neutrals establish paper depth while reserving full-saturation pine and cranberry strictly for actions and claim states.

### Primary
- **Pine Green** (`#008042`): Primary action buttons (`Send sign-in code`, `Add a gift`, `I’ll buy this`, `Save gift`) and active keyboard focus rings. Hover deepens to **Deep Pine** (`#006835`), while **Pine Ink** (`#005c2f`) on **Soft Pine** (`#e7f5ed`) carries `You picked this` badges and store links.

### Secondary
- **Cranberry Red** (`#c73213`): Festive berry accents in the holly emblem, strike-through decoration on claimed gifts, and `Confirm remove` destructive buttons (`#a7270d` on hover). **Cranberry Ink** (`#9f230a`) on **Soft Cranberry** (`#fdece8`) powers `Already picked` badges and error banners.

### Neutral
- **Warm Cream** (`#fff8f0`): Root page canvas and emblem disc backdrop.
- **Peach Cream** (`#ffdec3`): Top app header, sign-in hero band, and info banners, paired with **Ink on Peach** (`#46332b`) for high-contrast subtitles.
- **Snow White** (`#ffffff`): Raised family rows, available gift cards, form surfaces, and active navigation pills.
- **Tinted Cardstock** (`#fcf4ea`): Recessed surface for already-picked gift cards.
- **Warm Charcoal** (`#101010`) and **Warm Espresso** (`#5c4b43`): Primary headings/labels and muted helper text.
- **Warm Borders** (`#ead4c0` and `#d8baa0`): Input strokes, secondary button borders, and flat recessed card boundaries.

### Named Rules
**The Two-Voice Action Rule.** Only pine green (`#008042`) triggers primary gift/navigation commitment and only cranberry (`#c73213`) signals taken status or destructive confirmation; neutral surfaces handle everything else.

## Typography

**Display Font:** `Figtree` (with `system-ui, -apple-system, sans-serif`)
**Body Font:** `Figtree` (with `system-ui, -apple-system, sans-serif`)

**Character:** A clean, humanist-geometric sans-serif (`300–700` variable WOFF2 self-hosted in `public/fonts/`) whose rounded proportions match the warmth of holiday stationery while keeping compact mobile controls crisp.

### Hierarchy
- **Display** (`700`, `1.875rem`, `1.2` line-height, `-0.02em` tracking): Sign-in screen title (`Family Christmas Wishlist`).
- **Headline** (`700`, `1.625rem`, `1.2` line-height, `-0.02em` tracking): Screen section headings (`Family`, `My Wishlist`, `Mom’s Wishlist`, `Add a gift`).
- **Title** (`700`, `1.1875rem`–`1.25rem`, `1.2`–`1.35` line-height, `-0.02em` tracking): Header family name (`1.1875rem`) and gift/relative row titles (`1.25rem`).
- **Body** (`400`, `1.0625rem`, `1.5` line-height): Primary form inputs and main copy (`65ch` max measure on lead prose).
- **Label** (`600`, `0.8125rem`–`0.9375rem`, `1.2` line-height): Buttons, field labels, status badges, and `tabular-nums` OTP codes / gift counts.

## Layout

A single centered column (`max-width: 34rem`, `margin: 0 auto`) keeps reading and tapping consistent from `390px` phones (and future Android APK WebView) up to wide desktop viewports.

- Mobile padding: `20px` top / `16px` horizontal (`16px` / `12px` below `480px`).
- Desktop breathing room: `32px` top padding at `>= 640px`.
- Spacing rhythm pairs headings tightly with helper descriptions (`8px` vertical gap inside `.section-intro`) while keeping `20px`–`24px` separation between the header card, section groups, and card lists.

## Elevation & Depth

Surfaces declare elevation through **either** a single-layer warm ambient shadow **or** a flat tinted fill/border—never both on the same card.

### Shadow Vocabulary
- **Card Ambient** (`box-shadow: 0 8px 24px rgba(16, 16, 16, 0.06)`): Resting state on white family rows, available gift cards, and the sign-in container.
- **Card Lift** (`box-shadow: 0 12px 28px rgba(16, 16, 16, 0.09)`): Hover state on interactive family rows with `-1px` vertical lift.
- **Flat Recessed** (`box-shadow: none; border: 1px solid #ead4c0`): Used on `.gift-card--taken` so claimed gifts visibly recede without competing with active items.

## Shapes

- **Cards & Header Bands:** Generously curved `16px` radius (`--radius-card`).
- **Form Inputs & Confirm Strips:** `12px` radius (`--radius-nested`).
- **Buttons, Tabs & Status Badges:** Full pill `9999px` radius (`--radius-pill`) for clear touch affordance.
- **Signature Mark:** `<HollyEmblem />` uses crisp geometric scalloped leaves in `#008042` / `#006835` and three `#c73213` berries separated by `#fff8f0` (or `#ffdec3` on white surfaces) hairline strokes.

## Components

### Buttons
- **Shape:** Full pill (`9999px` radius), minimum `48px` height (`44px` for compact header/row actions).
- **Primary:** Solid `#008042` pine green with `#ffffff` label; `#006835` on hover.
- **Secondary / Text:** `#ffffff` with `1.5px solid #d8baa0` border (`#fff0e2` fill on hover); text buttons use transparent surface shifting to `#fff0e2`.
- **Cranberry:** Solid `#c73213` (`#a7270d` on hover) reserved for confirmed destructive removal.

### Navigation
- Warm `#ffdec3` header card houses the holly emblem, `1.1875rem` family title, `Sign out` pill, and a two-up pill switcher (`Family` and `My Wishlist`) inside a `rgba(255, 248, 240, 0.72)` track using `aria-current="page"`.

### Gift & Family Cards
- **Corner Style:** `16px` radius.
- **States:** Available cards sit elevated in `#ffffff`; claimed cards (`Already picked`) flatten to `#fcf4ea` with `1px solid #ead4c0`, cranberry strike-through title, and a `Soft Cranberry` pill badge.
- **Inline Confirmation:** Removing an unpicked gift expands an inline `#fdece8` confirmation box (`Confirm remove` / `Keep`) inside the card instead of opening a modal.

### Inputs & Fields
- **Style:** `48px` min-height (`96px` textarea), `12px` radius, `1.5px solid #d8baa0` border on `#ffffff`.
- **Focus:** `2.5px solid #008042` focus ring (`outline-offset: 2px`) and `0 0 0 3px rgba(0, 128, 66, 0.16)` input glow.

## Do's and Don'ts

### Do:
- **Do** keep gift rows in stable creation-time order (`created_at`, `id`) even as claim statuses change.
- **Do** pair every color or strike-through cue with explicit status text (`Already picked`, `You picked this`, `Wishlist coming soon`).
- **Do** declare elevation once per card—either ambient shadow or flat tint/border.

### Don't:
- **Don't** add kickers or eyebrow labels above headings.
- **Don't** use single-side border stripes on notices or gift cards.
- **Don't** reveal who picked a gift in `My Wishlist` or relative list responses.
- **Don't** replace `<HollyEmblem />` or `lucide-react` icons with Unicode emoji or glyph symbols.
