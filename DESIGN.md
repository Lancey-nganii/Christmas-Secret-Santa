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

<!-- impeccable:design-map -->
Name: Family Christmas Wishlist
Colors: primary: pine #008042; secondary: peach #ffdec3; tertiary: cranberry #c73213; neutral: cream #fff8f0; neutral: ink #101010
Fonts: Figtree (display, headline, title, body, label)
Spacing: xs 4px, sm 8px, md 16px, lg 24px, xl 32px
Radius: nested 12px, card 16px, pill 9999px
North Star: "The Holiday Cardstock Ledger"
Rules:
- The Two-Voice Action Rule. Only pine green (`#008042`) triggers primary gift/navigation commitment and only cranberry (`#c73213`) signals taken status or destructive confirmation; neutral surfaces handle everything else.
Elevation:
- Card Ambient: 0 8px 24px rgba(16, 16, 16, 0.06)
- Card Lift: 0 12px 28px rgba(16, 16, 16, 0.09)
- Flat Recessed: none; border: 1px solid #ead4c0
Don't:
- Don't add kickers or eyebrow labels above headings.
- Don't use single-side border stripes on notices or gift cards.
- Don't reveal who picked a gift in `My Wishlist` or relative list responses.
- Don't replace `<HollyEmblem />` or `lucide-react` icons with Unicode emoji or glyph symbols.
Do:
- Do keep gift rows in stable creation-time order (`created_at`, `id`) even as claim statuses change.
- Do pair every color or strike-through cue with explicit status text (`Already picked`, `You picked this`, `Wishlist coming soon`).
- Do declare elevation once per card—either ambient shadow or flat tint/border.
Map: public/fonts/
Full: .impeccable/design-full.md (read a section when you need its detail)
