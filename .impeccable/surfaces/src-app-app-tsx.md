---
version: 1
slug: "src-app-app-tsx"
primary_target: "src/app/App.tsx"
related_targets: ["index.html"]
---

# Surface Brief: Family Christmas Wishlist

- **Scope:** Whole authenticated family wishlist application (`Sign in`, `Family`, `My Wishlist`, `Add or edit a gift`, `Relative's wishlist`)
- **Visitor Mode:** Operate (family members completing wishlist creation, browsing, and gift picking tasks quickly and accurately)
- **Audience & Job:** Invited relatives checking what family members want for Christmas, claiming one gift per person without spoiling surprises, and keeping their own list up to date.
- **Constraints:** Warm cream `#FFF8F0` canvas, `#FFDEC3` peach-cream containers, `#101010` ink, `#008042` pine-green primary actions, `#C73213` cranberry accents/taken status, small geometric holly header mark, single-column centered layout (`max-width: 34rem`), **Family** and **My Wishlist** main tabs, inline/dedicated routes instead of lazy modals, zero kickers above headings, and text labels beside every visual cue.

## Direction contract

THESIS: A single-column warm holiday cardstock surface where every relative's row and gift card exposes its exact claim or lock state in plain words—eliminating holiday spreadsheet chaos and duplicate gifts without dark-mode obscurity or festive clutter.

OWN-WORLD: Warm cream paper ground (`#FFF8F0`), soft peach-cream header band and summary containers (`#FFDEC3`), crisp white raised gift/member cards (`#FFFFFF`) with single-layer warm ambient shadow, deep charcoal ink (`#101010`), warm espresso-taupe secondary copy (`#5C4B43`), pine-green pill action buttons (`#008042`), cranberry strike-through and taken pills (`#C73213`), self-hosted Figtree sans-serif typography, and a small geometric holly leaf-and-berry mark in the header.

STORY: A relative opens the app, enters their invited email and 6-digit code, immediately sees the family roster (**Family** vs **My Wishlist**), taps any relative to claim one gift with **I'll buy this** (seeing **You picked this** + **Undo** and a clear notice blocking extra picks for that person), or edits their own unpicked gifts while claimed items stay transparently locked as **Already picked**.

FIRST VIEWPORT: Centered single-column shell (`max-width: 34rem`) opening with a warm peach-cream card header featuring the compact holly mark, family title, sign-out control, and two-pill segmented switcher (**Family** / **My Wishlist**), immediately followed by the full-width stack of tappable relative rows (`[data-surface-thesis]` on the main wishlist workspace header/list and `[data-primary-action]` on the primary pine-green action or primary row CTA).

FORM: Hand-crafted single-column Holiday Cardstock Operate layout, `seed: none (pinned)` — "Warm cream canvas + Dribbble craft: cream/peach (#FFF8F0 / #FFDEC3) surfaces, #101010 ink, #008042 pine-green actions, #C73213 cranberry accents, holly header mark, generous rounded cards/pills, and Family / My Wishlist tabs" and "Use a warm cream background, cranberry accents, pine-green action buttons, and dark text. A small holly illustration in the header gives the app a Christmas-card feel. Use one column, generous tap targets, visible focus styles, and text labels beside visual status cues."

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
