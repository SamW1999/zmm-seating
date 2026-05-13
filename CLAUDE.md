# ZMM Seating Chart — Project Reference

## What This Project Is
A web app for ZMM synagogue (זכרון מנחם משה) that lets members view a seating chart, request seats, and lets admins manage everything. It has two sides:
- **Public**: anyone can view the chart and submit a seat request with their name and contact info
- **Admin**: password-protected; admins assign seats, approve/decline requests, customize the layout, and export the chart for printing or sharing

The target users on the admin side are non-technical people running a small shul. Everything must be simple, clear, and forgiving. No jargon, no complexity.

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
- Admin login is email + password. Only admins can assign, approve, or change anything.
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
7. Never stack seats vertically — single horizontal row always, regardless of seat count

### After making changes:
8. Read back the specific section you changed and confirm the logic is correct before claiming the task is done
9. Never say a fix is complete without evidence — run a check or read the changed code back
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
- **Do not put `disabled` on buttons that need to show tooltips** — disabled elements suppress native browser tooltips. Use a wrapper element for the tooltip instead.
- **Do not use word-breaking CSS that splits words mid-character** — always wrap at word boundaries first.
- **Do not bundle multiple unrelated fixes in one prompt** — one focused fix at a time prevents cascading bugs and makes verification easier.
- **Do not claim a fix worked without testing it** — the most common failure mode is fixing the wrong thing and not noticing.
