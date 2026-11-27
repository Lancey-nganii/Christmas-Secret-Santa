# Family Christmas Wishlist

A shared, invite-only family Christmas wishlist app built with **React**, **TypeScript**, **Vite**, and **Supabase**—designed for both web browsers and a future **Capacitor** Android APK.

## Architecture Overview

- `src/domain/`: Pure domain models, validation rules, error codes, and port interfaces (framework-free).
- `src/infrastructure/`: Supabase username/password Auth (`signInWithPassword` backed by `<username>@macorol.wishlist`), RPC wishlist adapter, organizer member-management Edge Function adapter, browser/platform lifecycle adapters, plus a dev-only preview adapter (`?preview=family`).
- `src/application/`: Session persistence/resume (`useAuthSession`) and synchronized polling/foreground-refresh hooks (`useSynchronizedResource`).
- `src/ui/`: Design tokens (`tokens.css`), typography (`fonts.css`), geometric `<HollyEmblem />`, and accessible UI primitives.
- `src/features/` & `src/app/`: Core screens (`Sign in`, `Family`, `Manage family`, `My Wishlist`, `Add or edit a gift`, `Relative's wishlist`) and URL routing.
- `supabase/migrations/`: Complete PostgreSQL schema (`app_private` schema, constraints, indexes, RLS), authenticated RPC API (`get_family`, `get_wishlist`, `add_gift`, `update_gift`, `remove_gift`, `pick_gift`, `undo_pick`), and organizer `service_role` helpers (`admin_get_organizer_context`, `admin_list_family_members`, `admin_create_family_member`).
- `supabase/functions/manage-member/`: Organizer-authenticated Edge Function for creating family accounts and resetting passwords.

## Supabase Setup Checklist

1. **Migrations deployed on `xjaucojgcuogzsjxtbds`:**
   - [`supabase/migrations/20261127000100_family_wishlist_init.sql`](supabase/migrations/20261127000100_family_wishlist_init.sql)
   - [`supabase/migrations/20261127000200_username_auth_and_organizer.sql`](supabase/migrations/20261127000200_username_auth_and_organizer.sql)

2. **Supabase Auth Settings for Persistent Username + Password Login:**
   - **Authentication -> Sign In / Providers -> Email**: Keep Email enabled and **Allow new users to sign up** disabled so public self-registration stays closed.
   - **Authentication -> Auth Hooks**: Disable the legacy **Send Email** hook (no email OTP codes are sent).
   - **Authentication -> Sessions**: Keep **Time-box user sessions** and **Inactivity timeout** set to `0` (disabled) and **Single session per user** off so relatives stay signed in persistently on their own browsers/devices.

3. **Adding or Resetting Family Members:**
   - Sign in as the family organizer (**Lance**) and open **Manage family** right from the **Family** header row (`/family/manage`).
   - Optionally batch-seed a new family via [`scripts/setup-roster.mjs`](scripts/setup-roster.mjs) or [`supabase/seed-roster.example.sql`](supabase/seed-roster.example.sql).

## Local Development & Verification

```bash
npm install
npm run dev
```

### UI Preview Mode (Development Only)

While developing without a live signed-in family session, `import.meta.env.DEV` exposes an interactive in-memory preview family (*The Rivera Family*, labeled `Sample preview`):

- `http://localhost:5185/?preview=signin`
- `http://localhost:5185/?preview=family`
- `http://localhost:5185/?preview=manage-family`
- `http://localhost:5185/?preview=my-wishlist`
- `http://localhost:5185/?preview=add-gift`
- `http://localhost:5185/?preview=relative`

### Tests & Production Build

```bash
npm test
npm run typecheck
npm run build
```

## Deploying to Vercel

1. Import this GitHub repository in Vercel (Vite preset).
2. [`.env.production`](.env.production) already provides the public Supabase client URL and publishable key (`sb_publishable_*`) so Vercel builds work out of the box. To target a different Supabase project, override these in **Project Settings -> Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. [`vercel.json`](vercel.json) rewrites all routes cleanly to `/index.html`.

## Android APK Setup & Phone Installation

Capacitor (`com.macorol.christmaswishlist`) bundles the same `dist/` web build into an Android app using native adapters in:
- [`capacitor.config.json`](capacitor.config.json)
- [`src/infrastructure/platform/lifecycle.ts`](src/infrastructure/platform/lifecycle.ts) (`@capacitor/app` `appStateChange`)
- [`src/infrastructure/platform/externalLinks.ts`](src/infrastructure/platform/externalLinks.ts) (`@capacitor/browser`)
- [`src/infrastructure/platform/nativeShell.ts`](src/infrastructure/platform/nativeShell.ts) (status bar style + Android back navigation)

### Building an Installable APK on Windows

Ensure `.env` holds your `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before building `dist/`, then sync and build with Android Studio's JDK & SDK:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm run android:sync
.\android\gradlew.bat -p android assembleDebug
```

- Output APK: `android/app/build/outputs/apk/debug/app-debug.apk` (installable directly on Android phones via USB `adb install` or by transferring the `.apk` file to your phone).
- For production release signing, open [`android/`](android/) in Android Studio (**Build -> Generate Signed App Bundle / APK**) and keep `.keystore` / `.jks` files out of git.
