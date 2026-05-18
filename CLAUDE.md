# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Project Is
A web app for ZMM synagogue (זכרון מנחם משה) that lets members view a seating chart, request seats, and lets admins manage everything. It has two sides:
- **Public**: anyone can view the chart and submit a seat request with their name and contact info
- **Admin**: password-protected; admins assign seats, approve/decline requests, customize the layout, and export the chart for printing or sharing

The target users on the admin side are non-technical people running a small shul. Everything must be simple, clear, and forgiving. No jargon, no complexity.

---

## Dev Commands

```bash
npm run dev     # start local dev server (port 3000, or next available)
npm run build   # production build — run this to catch type/compile errors
npm run lint    # ESLint
```

There is no test suite. Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Architecture

**Stack:** Next.js 15 App Router (`'use client'` on all pages), Supabase (PostgreSQL + Auth + Realtime), Tailwind CSS, `react-zoom-pan-pinch`.

### Routes
- `/` — public seating chart (`app/page.tsx`)
- `/admin` — admin dashboard (`app/admin/page.tsx`)
- `/admin/settings` — layout editor + danger zone (`app/admin/settings/page.tsx`)
- `/admin/login` — email/password login (`app/admin/login/page.tsx`)

`middleware.ts` protects all `/admin/*` routes: redirects unauthenticated users to `/admin/login` using `@supabase/ssr` server client.

### Data flow
Every page fetches `tables` with nested `seats(*)` via Supabase. The admin page also fetches `requests`. All fetched data passes through `lib/dedupe.ts` (`dedupeTables`) to remove duplicate rows that can accumulate if `supabase-setup.sql` is run more than once.

The admin dashboard subscribes to `postgres_changes` on all three tables via Supabase Realtime and re-runs `fetchAll()` on any change.

### Component hierarchy (rendering the chart)
```
SeatingGrid           — lays out a row×col grid; handles dynamic rows/cols
  FrontWall           — decorative front-of-room wall element
  TableBox            — one table cell; renders Bima, family mode, or seat row
    SeatButton        — one clickable seat (public) or display seat (admin)
```

**Admin overlays** (not part of the chart render tree):
- `EditDrawer` — right-side slide-over; fetches its own fresh seat+request data on open; handles per-seat name assignment, add/remove seats, bulk table actions
- `RequestQueue` — collapsible panel listing all requests with approve/decline
- `AdminToolbar` — fixed top bar; triggers PNG/PDF export, requests panel toggle, logout

### Critical layout constants
`TABLE_W = 300` and `TABLE_H = 88` are defined in `components/TableBox.tsx` and **manually mirrored** as `TW = 300` / `TH = 88` in `lib/buildExportCanvas.ts`. If you change either constant, update **both files**.

### Mobile layout
`isMobile = window.innerWidth < 1024`. On mobile, both pages wrap `SeatingGrid` in a `react-zoom-pan-pinch` `TransformWrapper`. The initial and minimum zoom scale (`fittedScale`) is calculated dynamically after the data loads:

```ts
const scaleW = containerW / 1600
const scaleH = containerH / 710
setFittedScale(Math.min(Math.max(scaleW, scaleH), 1))
```

`1600 × 710` are the approximate natural pixel dimensions of `SeatingGrid` at scale 1. If the grid layout changes significantly, these values may need updating.

### Export pipeline
PNG and PDF exports (`AdminToolbar`) use `lib/buildExportCanvas.ts` — a pure Canvas 2D renderer that replicates the chart visually. It is **dynamically imported** (`await import(...)`) to avoid SSR issues. It draws logo, title, front wall, column headers, and every table cell including family mode and individual seat names. It does not screenshot the DOM.

### Approving requests
`EditDrawer` calls the Supabase RPC `approve_request(p_request_id, p_seat_id, p_name)` which atomically assigns the seat and declines all competing pending requests. If the RPC is unavailable, it falls back to three sequential Supabase calls.

---

## Core Business Rules (Permanent)
These describe how the shul operates. Do not change these without explicit instruction.

- Seats are arranged in tables. Each table has between 3 and 5 seats.
- Seats within a table always display left to right in a single horizontal row — never stacked or wrapped.
- A seat is either available or reserved. There is no pending/yellow state visible to the public.
- Multiple people can request the same seat. The admin decides who gets it. First request has priority but admin has final say.
- Names on seats display as first initial + last name (e.g. S. Weinstein). Never truncate a name — wrap to a new line if needed.
- There is exactly one Bima in the room. It occupies one table cell and has no seats.
- The public submits requests with name, contact info, and an optional note. No login required.
- Exports (PNG and PDF) must be clean and print-ready — no web UI elements, no buttons, no interactive chrome. Just the chart.

---

## Database (Permanent Concepts)
Three core entities. Column names may change but these relationships will not:
- **Tables** — physical tables in the room, identified by row (letter) and column (number)
- **Seats** — belong to a table, have a position number, may be assigned to a member
- **Requests** — submitted by public users for a specific seat, have a status (pending / approved / declined)

---

## Behavior Rules for Claude Code
These are non-negotiable. Read before every task.

### Before making any change:
1. Read the specific file(s) you are about to edit — do not rely on memory or prior context
2. State exactly which lines you will change and why before changing them
3. If a fix has already been attempted and failed, stop and explain the root cause before trying again — do not just try a different approach blindly

### While making changes:
4. Edit existing files only — never rebuild a file from scratch unless explicitly instructed
5. Only implement what was explicitly asked — do not add features, refactor unrelated code, or "improve" things that weren't mentioned
6. When changing a dimension, constant, or value that is referenced in multiple files, update ALL of them — never update just one

### After making changes:
8. Read back the specific section you changed and confirm the logic is correct before claiming the task is done
9. Never say a fix is complete without evidence — run `npm run build` to catch type/compile errors, or read back the changed code if the change is non-compilable logic
10. If something was broken before your change and is still broken after, say so — do not claim success

---

## What Good Output Looks Like
When in doubt about a design or UX decision, use this as a guide:
- Simple and clean — this is a small shul, not a corporation
- Non-technical users must understand every admin screen without explanation
- Print exports must be legible to an elderly person reading a printout on the wall
- Mobile users on the public side must be able to use the chart without horizontal scrolling or squinting

---

## Anti-Patterns (Things We've Learned Not To Do)
These are permanent lessons. Do not repeat them.

- **Do not screenshot the DOM for exports** — always render exports programmatically. Screenshotting the page produces unreliable results with clipped text, wrong fonts, and missing elements.
- **Do not hardcode seat dimensions** — seat width must always be calculated dynamically based on how many seats are in the table and how wide the table is.
- **Do not read from stale React state inside async functions** — pass fresh data as parameters instead of relying on state that may not have updated yet.
- **Do not use word-breaking CSS that splits words mid-character** — always wrap at word boundaries first.
