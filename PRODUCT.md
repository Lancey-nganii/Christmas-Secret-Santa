# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Vite, modular CSS custom properties, and Supabase (`@supabase/supabase-js`), structured cleanly for a future Capacitor Android APK build.

## Users

Invited members of one extended family signing in on mobile browsers, desktop browsers, and an upcoming Android APK to share Christmas gift ideas and quietly coordinate what they plan to buy for one another.

## Product Purpose

Let each family member publish and maintain one personal Christmas wishlist, browse relatives' wishlists, and claim gifts they intend to buy without duplicates and without revealing who claimed any gift.

## Positioning

Invite-only single-family Christmas wishlist coordinator with database-enforced pick limits, row-locked editing protection, and private giver identity across both web and future Android clients.

## Operating Context

Family members sign in once with their family username and password (`SignInScreen`) and remain signed in persistently on their device/browser (`localStorage` + auto-refreshing tokens), switch between **Family** and **My Wishlist** tabs, add or update unpicked gifts (name, optional note, optional store link), and tap **I'll buy this** or **Undo** on relatives' lists. The designated family organizer (`is_organizer`) also has a **Manage family** view (`/family/manage`) to add new relatives and reset passwords directly in the app. The client refreshes when views open, when the app returns to the foreground, about every 15 seconds while visible, and immediately after writes or conflicts.

## Capabilities and Constraints

- First release serves one family; public sign-up is disabled and the family organizer provisions accounts (`family_members` records linked to internal synthetic auth emails `<username>@macorol.wishlist`) without email verification codes.
- One wishlist per member; members cannot pick gifts from their own list.
- Each gift allows at most one active pick; each giver allows at most one active pick per recipient.
- Picked gifts keep their original creation-time display order and remain locked against edits or removal while a pick exists.
- Viewers other than the giver (including the wishlist owner) see **Already picked** with a red strike-through and no giver identity; only the giver sees **You picked this**, **Undo**, and holds the specific `pick_id`.
- Store links are optional and accept only `http://` or `https://` URLs.
- Base tables remain private behind PostgreSQL database functions (`get_family`, `get_wishlist`, `add_gift`, `update_gift`, `remove_gift`, `pick_gift`, `undo_pick`) plus an organizer-guarded Edge Function (`manage-member`); no Firebase push notifications in v1.

## Brand Commitments

- Warm cream background (`#FFF8F0`), warm peach-cream secondary containers (`#FFDEC3`), `#101010` dark ink, `#008042` pine-green action buttons, and `#C73213` cranberry accents and taken status cues.
- Small holly emblem in the header for a tactile Christmas-card feel, grounded in the Dribbble Secret Santa mobile reference.
- Single-column layout centered on wider desktop viewports, generous tap targets, visible focus styles, and text labels paired beside all visual status cues.

## Evidence on Hand

- Architecture specification (`family-christmas-wishlist-architecture.md`) and Dribbble UI reference (`23324389-Secret-Santa-Mobile-iOS-App`).
- Live Supabase project `xjaucojgcuogzsjxtbds` (`https://xjaucojgcuogzsjxtbds.supabase.co`).
- Development-only `?preview=` mode includes clearly labeled synthetic family data (*The Rivera Family*) for visual verification when no real Supabase session is active.

## Product Principles

1. **Server-enforced fairness and privacy:** Constraints, row locks, and giver secrecy live in PostgreSQL functions rather than trusting client state.
2. **Stable reading order:** Gift rows never jump around when claimed or released so relatives keep their spatial bearings.
3. **Plain-language resilience:** Conflicts, locked items, invalid links, and network uncertainty resolve into calm, actionable messages.
4. **Cross-platform consistency:** Every control uses generous touch sizing, crisp contrast, and keyboard/screen-reader parity across mobile web, desktop, and future Android APK.

## Accessibility & Inclusion

Minimum 48px interactive tap targets on primary rows and buttons, WCAG AA contrast (`>= 4.5:1` body text, `>= 3:1` large text and controls), visible keyboard focus rings, and text status labels alongside color and strike-through cues.
