# Platform Logo Update and Favicon Integration

Design specification for replacing the temporary platform logo placeholders with the official `Logo linguainscript.png` logo and configuring it as the site favicon.

## Proposed Changes

### 1. Logo Asset
- **Source File**: `Logo linguainscript.png`
- **Destination File**: [NEW] `public/logo.png`
- This makes the logo available at the root URL path (`/logo.png`) for both React imports and HTML meta/favicon tags.

### 2. Main Page Layout (`index.html`)
- Add a `<link rel="icon" type="image/png" href="/logo.png" />` tag inside the `<head>` block to set the platform favicon.
- Update the page `<title>` from `My Google AI Studio App` to `LinguaInscript`.

### 3. Login Screen Components (`src/App.tsx`)
- **Charging Loader**: Replace the styled box showing the text `L` (lines 124-127) with an `<img>` tag showing `/logo.png`.
- **Login Header**: Replace the gradient header box showing the text `L` (lines 169-172) with an `<img>` tag showing `/logo.png`.

### 4. Navigation Sidebar (`src/components/layout/Sidebar.tsx`)
- Update the fallback when `schoolConfig.logoUrl` is not defined: render `/logo.png` instead of the styled initial letter block.

### 5. Git and GitHub Sync
- Add files to git: `public/logo.png`, `index.html`, `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `docs/superpowers/specs/2026-06-15-logo-update-design.md`.
- Commit changes with message: `feat: update platform logo and favicon`.
- Push commits to GitHub (`origin main`).

## Verification Plan

### Manual Verification
- Run the local dev server using `npm run dev` to verify:
  1. The favicon is displayed in the browser tab.
  2. The loader displays the official platform logo on page load.
  3. The login form header displays the official platform logo.
  4. The sidebar fallback displays the platform logo when logged in without a custom school logo configured.
