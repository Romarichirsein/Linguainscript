# Platform Logo Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the styled "L" text logo with the official PNG logo asset (`Logo linguainscript.png`) across the entire web application (loading screen, login header, and sidebar default fallback) and configure it as the browser favicon.

**Architecture:** Copy the logo to `public/logo.png` to make it accessible to both HTML templates and React components via absolute paths, update references to use `<img>` elements, and link it as a shortcut icon in the main layout.

**Tech Stack:** React, TypeScript, Vite, TailwindCSS, HTML5, Git.

---

### Task 1: Copy logo file to public assets
- **Create:** `public/logo.png`
- **Reference:** `Logo linguainscript.png`

- [ ] **Step 1: Copy the source logo image into the public directory**
  Run:
  ```powershell
  Copy-Item "Logo linguainscript.png" "public/logo.png"
  ```
  Expected: The file `public/logo.png` is successfully created.

- [ ] **Step 2: Commit the copied logo asset**
  Run:
  ```bash
  git add public/logo.png
  git commit -m "feat: add logo asset to public directory"
  ```
  Expected: Commit successfully created.

---

### Task 2: Configure Favicon and Page Title
- **Modify:** `index.html`

- [ ] **Step 1: Edit index.html to add the favicon and set the page title**
  Change the title to "LinguaInscript" and add a `<link rel="icon" type="image/png" href="/logo.png" />` inside the `<head>` element:
  ```diff
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  -   <title>My Google AI Studio App</title>
  +   <title>LinguaInscript</title>
  +   <link rel="icon" type="image/png" href="/logo.png" />
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>
  ```

- [ ] **Step 2: Commit the HTML branding updates**
  Run:
  ```bash
  git add index.html
  git commit -m "feat: configure page favicon and title"
  ```
  Expected: Commit successfully created.

---

### Task 3: Replace App Login Screen Logos
- **Modify:** `src/App.tsx`

- [ ] **Step 1: Replace loading/charging loader logo in src/App.tsx**
  Modify lines 124-127 to replace the pulsing "L" div with the official image logo.
  ```diff
  -            {/* Pulsing professional Logo block */}
  -            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-indigo-500/20">
  -              <span className="font-sans font-black text-3xl tracking-wider text-white">L</span>
  -              <div className="absolute -inset-1 rounded-3xl border-2 border-indigo-400/30 animate-ping opacity-60 pointer-events-none" />
  -            </div>
  +            {/* Pulsing professional Logo block */}
  +            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-transparent">
  +              <img src="/logo.png" alt="Logo" className="h-20 w-20 object-contain" />
  +              <div className="absolute -inset-1 rounded-3xl border-2 border-indigo-400/30 animate-ping opacity-60 pointer-events-none" />
  +            </div>
  ```

- [ ] **Step 2: Replace portal header logo in src/App.tsx**
  Modify lines 169-172 to replace the gradient box showing "L" with the official logo image.
  ```diff
  -                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 font-sans font-black text-2xl text-white shadow-xl shadow-indigo-500/20">
  -                  L
  -                  <div className="absolute inset-0 rounded-2xl border border-white/20" />
  -                </div>
  +                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-transparent">
  +                  <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain" />
  +                </div>
  ```

- [ ] **Step 3: Commit the App logo modifications**
  Run:
  ```bash
  git add src/App.tsx
  git commit -m "feat: replace hardcoded text logos in App login with official image logo"
  ```
  Expected: Commit successfully created.

---

### Task 4: Update Sidebar default Fallback Logo
- **Modify:** `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Replace school initials fallback in Sidebar**
  Modify lines 98-102 to render `/logo.png` as a fallback image instead of the initials letter box:
  ```diff
              {schoolConfig?.logoUrl ? (
                <img
                  src={schoolConfig.logoUrl}
                  alt="Logo"
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 object-cover rounded shadow-md border border-slate-700"
                />
              ) : (
  -             <span className={`flex h-8 w-8 items-center justify-center rounded font-bold text-sm text-white shadow-md ${schoolColorClass}`}>
  -               {schoolInitials || "LI"}
  -             </span>
  +             <img
  +               src="/logo.png"
  +               alt="Logo"
  +               className="h-8 w-8 object-cover rounded shadow-md border border-slate-700 bg-white"
  +             />
              )}
  ```

- [ ] **Step 2: Commit the Sidebar logo modifications**
  Run:
  ```bash
  git add src/components/layout/Sidebar.tsx
  git commit -m "feat: use platform logo as default fallback in Sidebar when school has no logo"
  ```
  Expected: Commit successfully created.

---

### Task 5: Push Updates to GitHub
- [ ] **Step 1: Push changes to remote repository**
  Run:
  ```bash
  git push origin main
  ```
  Expected: Success response from github.com.
