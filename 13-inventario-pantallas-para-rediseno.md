# Screen inventory — GFH Móvil, for UI redesign

> This document describes **every** screen in the app as it exists today in
> the codebase (`apps/mobile/app/`), including the auxiliary ones and the
> ones that are currently empty or incomplete. It's material for another AI
> (or a designer) to propose a new, modern interface **based on the
> functionality that's already built** — it doesn't describe how the app
> looks today pixel-by-pixel (that's in the code and in screenshots), but
> **what each screen does, with what data, in what states, and what's
> located where**, so the redesign doesn't lose any function or business
> rule along the way.
>
> This is not a design proposal. It's the functional contract a redesign has
> to satisfy.

## Language note — read this first

This entire document is written in English so it can brief a design AI
directly. **The app itself is in Spanish (Rioplatense Spanish — "vos",
informal), and every render the redesign produces must keep all UI copy in
Spanish**: screen titles, button labels, field labels, error messages,
empty-state text, everything a user reads. Wherever this document quotes an
actual piece of app copy, it's given **in the original Spanish, in quotes**
— translate the surrounding description, never the quoted string itself.
Route paths (e.g. `app/paciente/[id].tsx`) are real file paths and are left
as-is.

## How to use this document

Every screen is described with the same structure:

- **Route** — the real file under `apps/mobile/app/`.
- **Why it exists** — the question it answers or the task it solves.
- **Where it's reached from / where it leads** — its place in the
  navigation.
- **Data it shows and where it comes from** — what it fetches from the
  backend, what's local/derived.
- **States** — empty, loading, error, populated, edge cases.
- **Layout, top to bottom** — every visual block, in order, with what it
  contains and why it's there.
- **Interactions and rules** — what's tappable, what triggers what, which
  business rules apply.

## Visual direction to follow

> This design system comes from a reference set of renders the product
> owner already liked, so it's kept close to the source's own vocabulary
> (token names, color roles). It's guidance for the visual language, not a
> translation instruction — see the language note above: **every render
> must still be produced in Spanish.** Treat every English word in the
> tokens below (button labels, section headers like "CONTRAINDICATIONS") as
> a stand-in for its Spanish equivalent used throughout the rest of this
> document ("Contraindicaciones", etc.).

### Where this sits relative to the app's non-negotiable rules

This reference is an aesthetic direction — palette, type, elevation, shape
— layered on top of the functional contract described in the rest of this
document, not a replacement for it. Two things from the shared-system
section below stay fixed no matter what this reference says:

1. **The four-state clinical severity meaning** (grave/red, media/amber,
   ok/green, neutro/gray — "missing data is always neutral, never inferred
   safe") is a business rule, not a palette choice. This reference's own
   functional colors (Amber for moderate, Critical Red for
   contraindicated/life-threatening, a green for positive/safe) already
   line up with that mapping — adopt its exact hex values and finish, but
   keep the fourth state (neutral gray for "no data"), which this reference
   doesn't define on its own.
2. **The severity color, the count-badge scale, and the "this drug has an
   adjustment table" property-cyan are three different axes and must stay
   visually distinguishable** — this reference's Info Blue can serve as
   that property-cyan / monograph-accent role rather than as a fourth
   severity level.

Everything else below — the green-forward brand identity, Inter, the 8px
rhythm, tonal elevation instead of heavy shadows, pill buttons — is free to
replace the app's current visual system wholesale.

### Brand & style

Name: **"Clinical Clarity."** Positioned at the intersection of clinical
authority and human-centric empathy — modern and accessible rather than the
cold, sterile feel of legacy medical software, built to reduce cognitive
load during high-stakes checks (drug interactions, renal/hepatic dosing,
allergy blocks). Direction: **Modern Corporate, Minimalist** — generous
white space so patient-safety information is never crowded by decoration.
The target emotional response is calm confidence and precision, not
excitement.

### Color

- Anchored by a vibrant **Vitality Green** primary (`#006d37`, with a
  brighter `#27ae60` container tone and `#61de8a` as the inverse/dark-mode
  primary) — used for positive actions and "safe" affirmations. This maps
  directly onto the app's existing `ok` severity role, and can also become
  the new brand/primary color, replacing today's `#1F5E4A`.
- Background architecture is **"Paper & Mist"**: a soft off-white canvas
  (`#f8f9ff` / `#F8FAFC`) behind pure-white content containers
  (`#ffffff`), giving depth without shadow. A `surface-container` scale
  (`#eff4ff` → `#d3e4fe`, six steps) is available for nested layers (a card
  inside a card, a chip on a card).
- Functional colors, non-negotiable in this system too: **Amber `#F59E0B`**
  for moderate interactions, **Critical Red `#E11D48`** (or the darker
  `#ba1a1a` error tone) for contraindicated/life-threatening combinations,
  **Info Blue `#0EA5E9`** for monographs and educational content — this is
  the natural new home for the property-cyan role (renal/hepatic table
  markers, monograph section icons), not a severity level.
- Full token set (light mode) includes on-surface, outline, secondary and
  tertiary roles, plus fixed/dim variants for dark mode — see the raw
  frontmatter values in the source reference if the redesign needs the
  complete Material-style scale rather than just the headline colors above.

### Typography

Single family: **Inter**, chosen for legibility in small-scale data
environments — optimized for *scanning* drug lists and *reading*
monographs, which are two different reading modes the type scale should
support differently.

- `display-lg` 32/40, weight 700, tight tracking — page-level numbers (a
  Clcr ring's headline figure). On a phone, scale this down to
  `headline-md` (24/32, weight 600) for drug names specifically, to avoid
  awkward wraps on long brand names.
- `headline-sm` 20/28, weight 600 — section headers.
- `body-lg` 18/28 and `body-md` 16/24, weight 400 — reading copy
  (monograph prose); generous 1.5× line-height on purpose, for clinicians
  reading in low-light, high-stress settings.
- `body-sm` 14/20 — secondary/meta text.
- `label-caps` 12/16, weight 700, +0.05em tracking, uppercase — section
  eyebrows ("CONTRAINDICACIONES", "REACCIONES ADVERSAS" — in Spanish in the
  actual app, same visual treatment as this token's English example).
- `data-mono` 14/20, weight 500, slightly tight tracking — NOT a monospace
  font; a medium-weight cut of Inter used specifically to make dosage
  figures and chemical/active-ingredient names read as *data*, distinct
  from instructional body text. This can replace the app's current use of
  IBM Plex Mono for the same purpose (dosage numbers, Clcr figures, ATC
  codes) if the redesign standardizes on one family.

### Layout & spacing

**8px linear scale** (base 4px, steps at 4/8/16/24/32), fluid grid on
mobile (4 columns on handsets). 20px safe-area margins on screen edges
(thumb clearance). Two densities: **Comfortable** for reading (monographs,
onboarding) and **Compact** for scanning (interaction lists, patient
lists) — the same list-row pattern should be allowed to compress on
data-dense screens like the drug search or the interaction list. Within a
card, stack related fields (drug name + dosage + manufacturer) with a
consistent 4–8px gap to signal that they belong together, distinct from the
larger gap between unrelated cards.

### Elevation & depth

Avoid heavy drop shadows in favor of **tonal layering** plus very
restrained ambient shadow:

- **Level 0 (canvas):** soft gray/mist background.
- **Level 1 (cards):** pure white, with a 1px `#E2E8F0`-style hairline
  border instead of a shadow.
- **Level 2 (alerts that must float above the record):** a very diffused,
  low-opacity shadow (primary color at ~8% opacity, 12px blur) — reserved
  for genuinely urgent content (a contraindicated-interaction card, a
  blocking-allergy conflict banner), not used as a generic "important card"
  effect.
- Prefer 1px hairline separators over shadows for distinguishing rows
  inside a list or a monograph section.

This reads as a refinement of the app's existing three-level elevation
system (flat/medium/high) rather than a replacement — same idea (depth
signals importance, not color), tighter execution.

### Shape

Rounded, friendly, modern — but shape itself carries meaning:

- **Standard cards and input fields:** 8px (0.5rem) radius.
- **Alert banners:** 16px (1rem) — visibly rounder than a normal card, so
  an alert reads as a distinct object type at a glance, not just a card
  with a red border.
- **Buttons:** fully pill-shaped (`rounded-full`) — contrasts on purpose
  with the more structured, less-rounded data cards, so "this is tappable"
  and "this is information" stay visually distinct.

### Components — how this reference treats the app's existing primitives

- **Buttons** — Primary: solid Vitality Green, white text, pill shape,
  high contrast. Secondary: white with a 1px gray border. Destructive:
  solid red (e.g. the actual Spanish copy "Suspender tratamiento",
  "Eliminar paciente").
- **Interaction/severity chips** — High severity: red fill, bold white
  text, warning-icon prefix. Moderate: amber fill, dark text. Minor/info:
  light-blue fill, dark-blue text. This is a direct, ready-to-use
  replacement for the app's current chip/severity-pill styling — keep the
  Spanish severity words ("Contraindicado", "Grave", "Atención",
  "Informativo") as the chip text.
- **Input fields** — understated 1px border, thickens to 2px primary-green
  on focus. Labels always sit persistently above the field, never only as
  placeholder text — this already matches the app's current text-field
  behavior and should be kept.
- **Monograph cards** — sectioned by 1px dividers, `label-caps` uppercase
  section headers (in Spanish in the app: "POSOLOGÍA",
  "CONTRAINDICACIONES", etc.), high-contrast dosage text. Maps directly
  onto the app's existing monograph section screens (see G.7 below) and
  its section-icon-seal treatment — this reference's Info Blue is a good
  candidate accent for those section seals.
- **Status pips** — small circular dots next to a drug name in a list, for
  an at-a-glance safety read before opening the detail. This is exactly
  the app's existing severity-stripe pattern in list rows — the
  reference's version is a dot instead of a left-edge bar; either
  satisfies the same functional need (severity visible without opening the
  row), so the choice between dot and stripe is open to the redesign.

---

# Part 1 — The shared system

## 1.1 What the app is, in one sentence

A clinical cockpit for physicians: given a patient and their treatment, it
answers **"is this drug safe for this patient, today?"** by cross-checking
interactions, renal/hepatic adjustment, and condition/allergy alerts,
computed on the spot against what the doctor entered. All the computation
is deterministic (tables and rules, never a language model) and runs on the
backend — the app never computes clinical severity locally, except the
three public calculators (Cockcroft-Gault, Child-Pugh, LDL), which are
published formulas and don't depend on the proprietary catalog.

## 1.2 The palette

Two themes, light and dark, with the same semantic roles:

| Token | Light | Dark | Use |
|---|---|---|---|
| `ink` | `#122A23` | `#E2ECE7` | Primary text |
| `inkSuave` | `#5C6B64` | `#93A59D` | Secondary text |
| `tenue` | `#8CA39A` | `#6B7F76` | Placeholder, muted borders |
| `paper` | `#F3F6F3` | `#0C1613` | Screen background |
| `line` | `#DDE5E0` | `#2B3C35` | Borders and separators |
| `surface` | `#FFFFFF` | `#14211C` | Card background |
| `primary` | `#1F5E4A` | `#5CB092` | Brand — LIGHTENS in dark mode to preserve AA contrast |
| `primaryLight` | `#E7F0EA` | `#1B332B` | Muted brand backgrounds (active chips, icons) |
| `accent` | `#0D7068` | `#52B7AC` | Text links ("View", "Change") |
| `peligro` | `#991B1B` | `#F87171` | INTERFACE errors (not to be confused with clinical severity) |

**On top of that there's a clinical-severity scale, separate from the theme
palette and IDENTICAL in both themes** (it doesn't change with light/dark
because it's medical information, not a brand color):

| Color | Hex | Meaning |
|---|---|---|
| Grave (severe) | `#EF4444` (red) | Contraindicated or severe — demands action |
| Media (moderate) | `#F59E0B` (amber) | Caution |
| Ok | `#22C55E` (green) | The catalog AFFIRMS there's no problem (never from absence of data) |
| Neutro (neutral) | `#8CA39A` (gray) | No data — neither reassures nor alarms |

Plus a **count scale** (how many findings there are, not how severe they
are — four steps with their own background/text/border, used in numeric
badges), and a **property cyan** (`#075985` / `#E0F2FE`) reserved
exclusively for "this drug has an adjustment table" — never severity.

**The golden rule that runs through the whole system:** clinical-severity
color is a scarce resource. It's never used to decorate, or to indicate
"this is a calculator" or "this is a tool" — that's what the dedicated cyan
is for. If the redesign introduces a new color, it has to stay outside
these four roles or it collides with the existing clinical vocabulary.

## 1.3 Typography

IBM Plex Sans (text), IBM Plex Mono (figures, clinical data, drug codes)
family. Numeric figures ALWAYS use mono with `tabular-nums`: a Clcr going
from 9 to 10 can't shift the column.

Size scale with semantic names (no "loose" sizes on any screen):
`eyebrow` (uppercase labels, the smallest), `meta` (secondary text), `body`
(body text), `fila` (row/card title), `grande`, `titulo` (the largest, for
screen headers and featured figures).

## 1.4 Components repeated across almost every screen

- **`Pantalla`** — standard wrapper: a `ScrollView` with fixed padding,
  `paper` background, optional pull-to-refresh. Most read-only or
  simple-form screens are "a `Pantalla` with blocks inside."
- **`Superficie` / `SuperficieTocable`** — the system's base card, with
  three elevation levels (shadow). Visual hierarchy comes from
  **elevation**, not color: a card with findings rises, one without stays
  flat. `SuperficieTocable` also sinks 3% on press (via Moti/Reanimated).
- **`Espina`** — a 4px vertical stripe on a row's left edge, colored by
  severity. It's "the system's visual signature": appears in treatment
  rows, finding rows, patient rows.
- **`BloqueFormulario`** — groups fields under a title with its declared
  requirement level on the right: **Required / Recommended / Optional** (or
  a free-form state like "Current"). Every form in the app is built from
  these stacked blocks.
- **`CampoTexto`** — input with a label above it, and ALWAYS a line below
  showing the accepted range (visible before typing, not only on error).
  Three border states: normal (gray), implausible (amber — the value is
  odd but still computes), invalid (red — breaks the formula, doesn't
  compute).
- **`CampoFecha`** — `dd/mm/yyyy` mask + calendar button. The birth-date
  calendar starts by picking the YEAR first (paging month by month 80
  years back makes no sense).
- **`Chip`** — a selectable pill, used to pick from a small set (sex,
  route, severity, units).
- **`Boton`** — three variants: primary (solid green), secondary
  (outlined), destructive (red text on surface). Loading state with a
  spinner.
- **`Estado`** — the same component for empty/error: title + detail +
  optional action button.
- **`Skeleton` / `SkeletonLista` / `SkeletonFormulario`** — loading states
  shaped like the real content (never hint at data: pulsing gray
  rectangles only, never a half-filled ring or a figure).
- **`ResultadoConsulta`** — wraps any `useQuery`: shows the matching
  skeleton while loading, and on error distinguishes "offline" (actionable,
  with a retry button) from a generic error.
- **`HojaInferior` / `OpcionHoja`** — draggable bottom sheet
  (`@gorhom/bottom-sheet`) for contextual menus (the `+` create action, the
  `···` options menu).
- **`Anillo`** — an SVG arc drawing a figure against its max scale (used
  for Clcr, and generically for any "ring type" calculator). With no data,
  the ring is empty and gray — never hidden.
- **`GrillaRestricciones`** — the 4 restriction cards (pregnancy,
  lactation, renal, hepatic) in a 2×2 grid, ALWAYS all four present even
  without data.
- **`FilaAnimada`** — wraps lists that reorder themselves (e.g. after
  accepting an alternative) with a layout transition.
- **Its own bottom menu (not the native tab bar)** — 4 destinations
  (Patients, Groups, Search, Profile) plus a raised central circular button
  that opens Tools. Lives in the root layout, outside the `Stack`, so it
  survives any navigation (unlike a native tab bar, which would disappear
  once you enter a detail screen).

## 1.5 Four business rules that repeat across dozens of screens

Worth keeping in mind, since they shape the layout of almost every clinical
screen:

1. **When data is missing, it shows as neutral (gray) — never inferred as
   safe or dangerous.** A field with no data is NEVER painted green by
   default; green only appears when the catalog EXPLICITLY affirms it.
2. **Content not yet reviewed by a pharmacist is shown anyway, marked.** A
   "PENDING" row isn't hidden — it's flagged with an "Unreviewed" pill.
   Hiding unreviewed content would be more dangerous than showing it
   marked.
3. **Only an EXACT allergy match with SEVERE severity blocks a
   prescription.** A family-level cross-match (e.g. penicillin →
   cephalosporin) never blocks on its own — it requires explicit
   confirmation.
4. **Nothing clinical gets confirmed with just a toast.** A notice that
   disappears on its own after 3 seconds is fine for "group renamed," never
   for "drug added" — that gets confirmed by seeing the recalculated
   cockpit on screen.

---

# Part 2 — Navigation map

```
index (splash) → welcome → login / sign-up → disclaimer (1st time) → (tabs)

(tabs) — with its own always-visible bottom menu:
├── Patients (home)
├── Groups
├── Search
├── Tools (central button, not shown in the bar itself)
└── Profile

Outside the tabs (Stack, with a green header):
├── create-patient, create-group
├── group/[id] → group/[id]/edit
├── patient/[id] (the cockpit) → 13 sub-screens
├── prescription/[id]
├── drug/[id] (the drug sheet) → 6 sub-screens
├── tools/{interactions,condition-allergy,renal,hepatic,clcr,ldl}
├── profile/{account,password,sessions,theme,notifications,threshold,subscription,help,legal,about,delete-account}
├── paywall, subscription-expired
└── recover-password
```

---

# Part 3 — The screens

## Block A · Entry and authentication

### A.1 · Splash / entry
**Route:** `app/index.tsx`

**Why it exists:** decides, with no user interaction, whether there's a
saved session.

**Layout:** full-screen `primary` (green) background, nothing tappable.
Vertically centered: an 80×80 square with a translucent white background
and the letters "GFH" in white, with a white spinner below it. No text, no
real logo — it's a placeholder mark.

**States:** only one is ever visible (loading); it resolves on its own and
redirects to `/(tabs)` or `/welcome` without the user ever seeing anything
else.

---

### A.2 · Welcome
**Route:** `app/bienvenida.tsx`

**Why it exists:** the first screen the user actually sees. Sells the
value proposition in one sentence and offers the two entry points.

**Layout, top to bottom:**
1. Solid `primary` background, full screen height.
2. Vertical center: a 96×96 square with "GFH", below it the headline
   **"¿Es seguro este fármaco para este paciente, hoy?"** ("Is this drug
   safe for this patient, today?" — large, white, centered), below that a
   smaller, semi-transparent paragraph explaining what the app does
   (interactions, renal, alerts).
3. Footer: two stacked buttons — "Iniciar sesión" ("Log in," solid white,
   green text) and "Registrarme" ("Sign up," white outline, white text).
4. At the very bottom, a very small, muted line: the permanent legal
   disclaimer ("Support tool... doesn't replace the physician's judgment").

**No header, no back button** (this is the screen you leave, not the one
you enter).

---

### A.3 · Log in
**Route:** `app/login.tsx`

**Why it exists:** email/password authentication.

**Layout:**
1. No native header — a **floating** back button (circle, arrow icon)
   over the content, top-left, respecting the safe area.
2. Content vertically centered in a `ScrollView`: green square logo with
   "GFH", title "Iniciar sesión" ("Log in"), subtitle.
3. Two fields: Email (email-type keyboard), Password (hidden).
4. Server-error area (only appears on failure, bordered box).
5. "Entrar" ("Log in") button (green, full width).
6. "Olvidé mi contraseña" ("Forgot my password") text link, centered.
7. **Permanent fixed footer:** the legal disclaimer, in its own strip
   separated by a border, always visible (doesn't scroll away).

**Behavior:** on successful login, if the plan isn't active, it also pushes
to Paywall (on top, via `push`, so it can be closed and login can
continue).

---

### A.4 · Create account / Sign-up
**Route:** `app/registro.tsx`

**Why it exists:** new account creation.

**Layout, three stacked form blocks** (each with its requirement level):
1. **"Quién sos" ("Who you are") · Required** — First and last name in one
   row, Email below.
2. **"Para entrar" ("To log in") · Required** — Username (with a note:
   "can't be changed later"), Password, Confirm password.
3. Standalone info box: "You start on the free plan: one patient, with all
   checks included."
4. Server error, if any.
5. Native header titled "Crear cuenta" ("Create account") with an explicit
   back arrow (unlike other screens, this one always has an exit even with
   no history).

**On confirm:** creates the account, logs in automatically, and sends the
user to `/disclaimer` (never straight to Patients — the first-entry
disclaimer is mandatory).

---

### A.5 · Recover password
**Route:** `app/recuperar.tsx`

**Why it exists:** today it's an honest placeholder — the email-based
reset flow isn't wired up yet (no email provider). Instead of faking a
form that sends nothing, it states the truth up front.

**Layout:**
1. Card with a gray dot + "Not automatic yet" + explanation.
2. "In the meantime" block with the support email address in mono.
3. "When it's connected" block explaining what this screen will do in the
   future.
4. "Write to support" button that opens the mail client (`mailto:`).

**Note for the redesign:** once the real flow is connected, this screen
gains an email field + a send button. Today's design is deliberately
transitional.

---

### A.6 · First-entry disclaimer
**Route:** `app/disclaimer.tsx`

**Why it exists:** mandatory legal consent, once per account, with a
checkbox that can't be skipped.

**Layout:**
1. No header. Large title at the top: "Antes de empezar" ("Before you
   begin").
2. Scrollable body with three paragraphs of legal/clinical text (what the
   tool is, always verify against the official monograph, content under
   review).
3. Fixed footer, separated by a border: custom checkbox (square with an
   animated check) + acceptance text, and below it the "Continuar"
   ("Continue") button, **disabled until the checkbox is checked**.

**Non-negotiable rule:** this consent is recorded with a version — if the
legal text changes, it must be possible to re-request it and prove which
version each physician accepted.

---

### A.7 · Paywall
**Route:** `app/paywall.tsx`

**Why it exists:** the subscription sales screen. It opens from five
different places, each with a reason (`motivo`: `paciente`, `consultas`,
`herramienta`, `grupo`), and the header text changes depending on where it
came from — never generic.

**Layout:**
1. Title and copy that change based on `motivo` (e.g. "You used up your
   free lookups" vs. "Load your patients").
2. "Qué incluye" ("What's included") card: 4 lines, each with a green
   check.
3. Two selectable plan cards (radio): **Annual** (with the equivalent
   monthly price and "two months free") and **Monthly**. The active one
   gets a thicker green border.
4. Honest notice: "Billing isn't connected yet" (RevenueCat integration
   pending).
5. Small print: cancellation policy.
6. Fixed footer: a large button with the chosen plan's price written on it
   ("Suscribirme · USD 69,99 al año" — "Subscribe · USD 69.99/year"), and
   below it "Ahora no" ("Not now") as plain text.

**Important for the redesign:** there's no "stay on the free plan" option
in the footer — closing the screen IS that option, on purpose (you land
here from something you were trying to do, and the way back is closing,
not picking a third button).

---

### A.8 · Subscription expired (full lockout)
**Route:** `app/suscripcion-vencida.tsx`

**Why it exists:** lockout screen shown when the backend returns a 403 for
an expired subscription. Replaces the ENTIRE app while it lasts.

**Layout:** vertically centered.
1. Circle with "!" on a light-green background.
2. Title "Your subscription expired" + text explaining the data is still
   saved.
3. "See plans" button (leads to Paywall) and below it "Log out"
   (secondary).
4. Neutral note at the bottom: the status comes from the store and may
   take time to sync.

**Open question flagged in the code itself:** today it's a full lockout;
a read-only mode was never confirmed as an alternative.

---

## Block B · The 4 main tabs

### B.1 · Patients (home)
**Route:** `app/(tabs)/index.tsx`

**Why it exists:** the landing screen once logged in. A list of every one
of the physician's patients, sorted by severity (not alphabetically).

**Where it's reached from / where it leads:** first tab in the bottom
menu. Each row leads to that patient's cockpit (`patient/[id]`).

**Data:** a single query returns the whole list with the clinical engine
already run for each patient (worst finding, number of findings, Clcr).

**Layout, top to bottom:**
1. Green header titled "Pacientes" ("Patients") with a circular `+`
   button on the right that opens a bottom sheet (Create patient / Create
   group).
2. Search field by first or last name (filters locally, from the first
   letter typed).
3. **"Requieren atención · N"** ("Need attention · N") section — patients
   with at least one finding, each row with a colored severity stripe on
   the left, name + age + group, and on the right the Clcr (large mono
   number + unit) and a numeric badge for the finding count (count scale,
   not severity scale).
4. **"Sin hallazgos · N"** ("No findings · N") section — same row format,
   no badge, flat (no elevation).
5. Empty state if there are no patients ("You haven't added any patients
   yet" + "Create patient" button), or "No matches" if the search finds
   nothing.
6. Pull-to-refresh.

**Free-plan rule:** the `+` → "Create patient" button checks the plan
before navigating; if the quota is used up, it goes straight to Paywall
instead of letting a form open that would just bounce back.

---

### B.2 · Groups
**Route:** `app/(tabs)/grupos.tsx`

**Why it exists:** NOT another patient list — it answers "how is each
practice/ward doing?" at a glance, without opening anything.

**Layout:**
1. Header with a `+` that creates a group (or goes to Paywall without a
   subscription).
2. One card per group (plus an implicit "no group" bucket if applicable),
   each with:
   - Group name, and on the right a chevron or a **cyan lock** if the
     user has no subscription (groups are entirely paid — there's no
     partial free version).
   - A **horizontal composition bar**: color segments proportional to how
     many patients in the group sit at each severity level
     (green/gray/amber/red), ordered from calm to severe.
   - Below it, figures in text: "N patients · N contraindicated · N
     severe · N need attention" (only the ones with a count > 0).
3. Empty state with a "Create group" CTA.

**Rule:** empty groups are shown at reduced opacity with "No patients." in
place of the bar.

---

### B.3 · Search
**Route:** `app/(tabs)/buscador.tsx`

**Why it exists:** the full catalog of commercial products (~638),
searchable without a server round-trip on every keystroke — the whole
index is downloaded once and filtered on the phone.

**Layout:**
1. Fixed search field at the top ("Buscar por marca o principio activo" —
   "Search by brand or active ingredient"), NEVER unmounted (critical: if
   the field lived inside the area that gets replaced when results load,
   it would lose focus on every letter).
2. "Catálogo" ("Catalog") or "Resultados" ("Results") label + match count.
3. **Virtualized list** (`FlashList`, not a `ScrollView` — the catalog is
   large) of product rows: brand name + dosage on the same line (name in
   black, dosage in gray), below it active ingredients or "Genérico"
   ("Generic") + manufacturer, and on the right the **two ownership
   markers "R" / "H"** (renal / hepatic) in cyan if the drug has that
   table, blank/empty if not — the space for both always exists, so the
   column stays aligned while scrolling.
4. With no active search, separator letters ("A", "B"...) are inserted
   each time the initial letter changes — only when browsing the whole
   catalog, not in search results.
5. No results: a message including the searched term.

Each row leads to `drug/[id]` (the drug sheet, see Block G).

---

### B.4 · Tools
**Route:** `app/(tabs)/herramientas.tsx`

**Why it exists:** a catalog of "standalone" checks (no patient attached)
— free calculators plus catalog-crossing tools (paid). Reached via the
central button in the bottom menu, not a visible tab.

**Layout:**
1. Tool search field.
2. Category filter chips, horizontally scrollable — hidden while
   searching/filtering.
3. **"Usadas hace poco"** ("Recently used") section if there's recent
   history and nothing is being searched/filtered.
4. While searching: a flat list of matches with the matched text
   highlighted in amber.
5. Not searching: grouped by category, each group in its own card with
   rows separated by a line.
6. Each row: an icon in cyan (never a clinical color — this isn't a
   clinical output), title + one-line detail, and on the right a **cyan
   lock** if it crosses the catalog and there's no subscription, or a
   chevron if it's free or already paid for.
7. Searching for something that doesn't exist as a tool (e.g. a drug name)
   explicitly offers "Buscar «X» en fármacos" ("Search «X» in drugs") →
   sends the user to Search with the term pre-filled.
8. Footer: a note explaining what's free vs. paid, or that nothing is
   saved.

**The 6 catalog tools:** Interactions (cross-checks N drugs), Condition and
allergy (1 drug against loose conditions/allergies), Renal adjustment (N
drugs against a Clcr), Hepatic adjustment (standalone Child-Pugh),
Creatinine clearance (free), LDL cholesterol (free).

---

### B.5 · Profile
**Route:** `app/(tabs)/perfil.tsx`

**Why it exists:** hub for account, preferences, and access to 11
sub-screens — but several rows show their current value right there, so
you don't always need to open them.

**Layout, top to bottom:**
1. Identity card: circular avatar with initials on a green background,
   name + email, and a pill on the right reading "Activa" ("Active,"
   green) or "Gratis" ("Free," gray) based on subscription status.
2. Tappable plan card, with a status dot + text ("Free plan" / "Active
   subscription" / "Billing issue" / "Expired" / "Cancelled, active
   until...") + renewal/expiration date + store. Footer note that
   cancellation happens through the store.
3. **"Cuenta" ("Account") group**: Personal data, Password, Active
   sessions (with the device count on the right).
4. **"Preferencias" ("Preferences") group**: Theme (showing the current
   value: Light/Dark/System), Notifications (On/Off), Elderly threshold
   (showing the value in years).
5. **"Información" ("Information") group**: Help & support, Terms &
   privacy, About GFH.
6. **Standalone group**: Log out, Delete account (in red).
7. Footer: app version number, very small and gray.

Every row in these groups follows the same pattern: icon + title +
optional value on the right + chevron.

---

## Block C · Patients: creation, editing, deletion

### C.1 · Create patient
**Route:** `app/crear-paciente.tsx`

**Why it exists:** patient creation with renal function computed live.

**Layout, three blocks:**
1. **"Datos del paciente" ("Patient data") · Required** — First + last
   name (one row), Date of birth (with a calendar picker), Sex (chips
   F/M/Other, with a clarifying note if "Other" is picked: it uses the
   same factor as "Male" in the formula), ID document (optional).
2. **"Función renal" ("Renal function") · Recommended** — Height, Weight,
   Creatinine (three fields in a row), and below it **the Clcr result
   computed live** while typing (light-green chip with the large number
   and the explanation "Cockcroft-Gault"), or "Clcr not computed — missing
   weight or creatinine" if there isn't enough data yet.
3. **"Grupo" ("Group") · Optional** — chips for existing groups + "No
   group."
4. Fixed footer: "Crear paciente" ("Create patient") button, disabled
   until the required fields are filled.

**Free-plan rule:** if the physician has already used up the free quota,
the screen isn't even shown — it redirects to Paywall before the form is
visible at all (letting someone fill out 7 fields only to get bounced
would be double the work).

---

### C.2 · Edit patient
**Route:** `app/paciente/[id]/editar.tsx`

**Layout:** a plain form (no requirement-labeled blocks) — First name,
Last name, ID document, Date of birth, Height, Sex (chips), Group (chips).
Note: "Weight and creatinine are edited from Renal function" (not here).
Save button.

**Danger zone at the bottom:** visually set apart (extra spacing above),
labeled "Zona de riesgo" ("Danger zone"), a neutral warning explaining what
gets deleted, and a red "Eliminar paciente" ("Delete patient") button with
a native confirmation (`Alert`).

---

## Block D · The cockpit and its 13 sub-screens

### D.1 · Patient cockpit (the app's central screen)
**Route:** `app/paciente/[id].tsx`

**Why it exists:** answers, at a glance, whether there's anything dangerous
in the patient's current treatment. It's the most-visited screen and the
one a physician spends the most time looking at.

**Layout, top to bottom (deliberate order — opens with the answer, not
with the raw data):**

1. **Header** with the patient's name as the title, and a `+` on the right
   that opens a bottom sheet with "Add drug / Add condition / Add
   allergy."

2. **Verdict** — the first card, background tinted by severity (very pale
   red / very pale amber / very pale green / white): colored dot + one-line
   headline ("1 contraindicated interaction," never a broken-out counter)
   + one line of detail.

3. **Patient card** (the only card on the screen with HIGH elevation —
   hierarchy by depth, not color):
   - `···` menu at the top right (patient options: renal, hepatic,
     pregnancy/lactation, conditions and allergies, history — each option
     shows what's already on file before you enter it).
   - **Clcr ring** on the left (colored arc + figure + unit + a KDIGO
     grade badge).
   - On the right, three data points in a column: Age, Sex, "Clcr source"
     (Calculated/Measured + how long ago).
   - Below, separated by a line, **active-condition chips** (pregnancy
     shows the week; the ones derived automatically — elderly, pregnant,
     lactating — use an outline instead of a fill, to distinguish "the
     engine inferred this" from "the physician entered this"). Tapping
     them leads to Conditions and allergies.

4. **"Lo más grave" ("Most severe")** — up to 2 cards with the most severe
   findings, each with a color stripe + title + severity label + text. If
   there are more, a "See all N findings" button appears below.

5. **"Por categoría" ("By category")** — a 2×2 grid (Interactions,
   Conditions, Renal adjustment, Hepatic adjustment): each card has a
   color stripe (that category's worst finding) + name + large number.
   Cards at zero stay flat and semi-transparent. Hepatic adjustment shows
   "—" instead of 0 when there's no table to evaluate against (distinct
   from "zero findings"). Tapping any of them leads to the detail view
   filtered by that category.

6. **"Tratamiento activo · N" ("Active treatment · N")** — with a "Load
   treatment" link to the right of the title. Each drug is a row with a
   colored stripe, name, dosage (mono) + frequency, a finding-count badge
   on the right, and an "No se verifica" ("Not checked") pill if it's a
   free-text drug (not in the catalog). Empty state with an "Add drug"
   CTA.

7. If there are notices (missing data blocking some evaluation), a row at
   the bottom: "N missing data points · View."

**Pull-to-refresh** across the whole screen (the cockpit changes based on
actions taken on other screens).

---

### D.2 · Edit renal data
**Route:** `app/paciente/[id]/datos-renales.tsx`

**Layout:**
1. **"Ahora" ("Now"), labeled "Vigente" ("Current")** — the current Clcr,
   large, with its provenance in text (calculated/measured, when, from
   what data), or a message that there's no data yet.
2. **"Nuevo valor" ("New value")** — "Calculate" / "Enter it directly"
   mode chips. Calculate asks for Weight + Creatinine; Enter it directly
   asks for the Clcr itself.
3. **Delta**: a chip with the old value struck through → arrow → the new
   value in large type, and a caption explaining what changes (e.g. if it
   crosses an adjustment-table threshold).
4. **"Fecha del análisis" ("Test date") · Optional** — date field, with a
   note that leaving it blank uses today's date.
5. Footer: **"Guardar y recalcular"** ("Save and recalculate") button —
   not just "Save," since this reruns all 5 of the patient's checks.

---

### D.3 · Edit hepatic data (patient's Child-Pugh)
**Route:** `app/paciente/[id]/datos-hepaticos.tsx`

Reuses the same declarative "mold" `Calculadora` component as the
standalone Child-Pugh tool, with three differences: it starts pre-filled
with whatever's already saved, it asks for the exact test value (not just
the band), and it has a save button.

**Layout (inherited from the `Calculadora` component; see 3.6 below for
the cascading-mold detail):** the 5 criteria one at a time in cascade mode
(bilirubin, albumin, INR, ascites, encephalopathy), the result as a score +
class (A/B/C), a notice explaining that a per-drug hepatic adjustment table
doesn't exist yet, a test-date field, and a save button.

---

### D.4 · Edit pregnancy and lactation
**Route:** `app/paciente/[id]/embarazo-lactancia.tsx`

**Layout:**
1. **"Embarazo" ("Pregnancy")** — "No data" / "Yes" chips. If "Yes": a
   gestational-weeks field, and a chip showing the computed trimester +
   the week number in large type as you type.
2. **"Lactancia" ("Lactation")** — "No data" / "No" / "Yes" chips (unlike
   pregnancy, here you CAN explicitly save "No" — it records that the
   question was asked).
3. Note: once the week is entered, "Pregnancy" appears as a cockpit
   condition automatically.
4. Footer: "Guardar y recalcular" ("Save and recalculate") button.

---

### D.5 · Active conditions and allergies
**Route:** `app/paciente/[id]/condiciones-alergias.tsx`

**Layout:**
1. **"Condiciones · N" ("Conditions · N")** section — one row per
   condition: name, meta text (notes, or how many drugs it crosses), gray
   stripe, "Remove" button with confirmation.
2. **"Alergias · N" ("Allergies · N")** section — one row per allergy:
   name, allergy family if applicable, stripe colored by severity, and a
   **consequence pill** ("Blocks" / "Requires confirmation"), "Remove"
   button.
3. Fixed notices explaining the blocking rule (exact + severe only) and
   that an allergy with no known cross-reaction stays on file but inert.
4. Fixed footer: two side-by-side buttons, "Add condition" / "Add
   allergy."

---

### D.6 · Add condition
**Route:** `app/paciente/[id]/agregar-condicion.tsx`

**Layout:**
1. **"Condición" ("Condition") · Required** — if the catalog has more than
   10 conditions, a search field appears; chips are always filtered by
   whatever's typed.
2. If one is picked: **"Desde cuándo" ("Since when") · Optional** —
   diagnosis date, with a note that it does NOT affect the engine, it's
   context only.
3. Info block: which conditions are NOT entered manually (elderly,
   pregnant, lactating — those are derived automatically).
4. "Add condition" button.

---

### D.7 · Add allergy
**Route:** `app/paciente/[id]/agregar-alergia.tsx`

**Layout:**
1. **"A qué" ("To what") · Required** — "To a drug" / "Free text" chips.
   Drug: a single-active-ingredient search field. Free text: a text field
   + note that if it matches a known family it still cross-reacts.
2. **"Severidad" ("Severity") · Required** — Mild/Moderate/Severe chips,
   below which a text changes depending on the exact combination picked,
   explaining the real consequence ("This will block prescribing..." vs.
   "This will require confirmation...").
3. "Add allergy" button.

---

### D.8 · Add drug
**Route:** `app/paciente/[id]/agregar-farmaco.tsx`

**Layout:**
1. **"Producto" ("Product") · Required** — "From the catalog" / "Free-text
   drug" chips. From the catalog: live-suggest search field; once picked,
   it's shown as a card with a "Change" button. Free-text: a text field +
   note that it won't be checked.
2. **"Pauta" ("Regimen") · Required** — Dosage + Frequency (one row),
   Route (chips).
3. **"Indicación" ("Indication") · Optional** — what it's prescribed for.
4. **Fixed footer, with conflict logic:**
   - If the backend returns a 409 for an allergy, a conflict card appears
     ABOVE the button: red "Cannot be prescribed" (blocked, button
     disabled) or amber "Related allergy" (requires confirmation).
   - The button's label changes based on the case: "Add to treatment" or
     "Confirm and add" — never two separate buttons.

---

### D.9 · Load treatment (text list)
**Route:** `app/paciente/[id]/cargar-tratamiento.tsx`

**Why it exists:** load several drugs at once by pasting/typing a list,
with automatic matching against the catalog — but **nothing is ever
created without a line-by-line review** (non-negotiable rule #2).

**Step 1 — Paste:**
1. Large textarea: "Paste or type the list" (one drug per line).
2. A grayed-out "From a photo" block, with the reason clearly stated
   ("not connected yet") and a "Try anyway" link that surfaces the real
   error.
3. Footer: a button stating how many lines it's about to look up ("Search
   N lines in the catalog").

**Step 2 — Review:**
1. Collapsed header showing how many lines were pasted and how many were
   matched, with "Change" to go back to step 1.
2. Notice: "Nothing loads until you confirm."
3. Counter "N of M selected" + "Select all" link.
4. One card per line:
   - **Matched:** checkbox + the original text in italics + the suggested
     name; checking it reveals editable dosage/frequency fields
     (pre-filled with what was detected).
   - **No match:** amber stripe, original text, "No match in the
     catalog," "Look it up manually" button (leads to Add drug).
5. A notice if any selected line is missing dosage/frequency.
6. Footer: "Add N to treatment" button.

---

### D.10 · Patient history
**Route:** `app/paciente/[id]/historial.tsx`

**Why it exists:** the only screen that looks backward — what was done and
when, so a decision can be explained months later. Everything else in the
app answers "is it safe today?"; this one answers "what happened?"

**Layout:**
1. **Filters** in two rows of horizontally scrollable chips: by event
   group (All / Treatment / Tests / Conditions / Patient) and by period
   (month / quarter / all time).
2. **Timeline-style list** (`FlashList`, with infinite scroll):
   - Day headers ("Today," "Yesterday," a date).
   - Each event is a row with a **dot on a continuous vertical thread**
     (not loose rows): solid fill in the brand color for a new
     treatment, gray for patient data, an **empty ring** (no fill) for a
     discontinuation/withdrawal — the shape distinguishes, not the color,
     because the "attention" color already means something else in the
     app.
   - Each row: title, optional detail, and if values changed, a small
     "before → after" table with the old value struck through, plus the
     time in mono.
3. List footer: a spinner while loading more, or "That's everything on
   record."

**Important:** there's no filter by drug name (deliberately dropped — the
event stores the text exactly as it was written at the time, not a live
reference to the drug, so deleting a drug from the catalog doesn't leave
holes in the history).

---

### D.11 · Therapeutic alternatives
**Route:** `app/paciente/[id]/alternativas.tsx`

**Why it exists:** given a problematic drug in the treatment, suggests
already-vetted replacements checked against THIS patient specifically
(their allergies, conditions, interactions with the rest of the
treatment).

**Layout:**
1. Collapsed header: "En lugar de [drug]" ("Instead of [drug]") +
   summary (how many are viable, how many are clean).
2. Notice if some data is missing for the evaluation.
3. Groups by severity, best to worst: "Sin alertas · N" ("No alerts · N,"
   green dot) then by severity range.
4. Each alternative: name + problem count, an "Already documented" pill if
   it's been accepted before, reason/evidence, a list of concrete problems
   with a colored dot, "Replace with [name]" button.
5. "Not offered" section at the end: discarded alternatives with the
   reason (severe allergy, contraindicated cross-interaction...).

---

### D.12 · Accept/replace with an alternative
**Route:** `app/paciente/[id]/aceptar-alternativa.tsx`

**Why it exists:** executes the actual swap — creates the new prescription
and discontinues the old one in a single operation. Requires explicit
confirmation (non-negotiable rule #7; the disclaimer appears 4 times across
the app, and this is the third).

**Layout:**
1. "Out → In" card: old name struck through on the left, arrow, new name
   in green on the right.
2. **"Pauta de [alternative]" ("Regimen for [alternative]") · Required** —
   Dosage, Frequency, Route. Dosage is always entered by hand (the catalog
   never suggests it — that would violate the "zero AI, always traceable"
   rule).
3. Notice if the old drug is about to leave the treatment.
4. **Fixed footer:** an explicit consent checkbox ("This change is my own
   decision...") + "Apply change" button, disabled until it's checked.

---

### D.13 · Findings detail (shared screen, 4 modes)
**Route:** `app/paciente/[id]/hallazgos.tsx`

**Why it exists:** a single screen that serves four different cuts
depending on navigation parameters: all findings, by category, by drug, or
notices only. It's deliberate that this is one implementation (the "what
to show" logic lives separately from the "how to show it").

**"By category" mode — the only swipeable one:**
- A horizontal row of chips (one per category), each with a count and the
  color of its worst finding.
- Below it, a swipeable `PagerView`: each page is that category's finding
  list. Swiping changes category without returning to the cockpit.

**The other three modes** (all / by drug / notices): a simple screen, no
pager. In "by drug" mode, a card shows the current regimen with an "Edit
or discontinue" link (leads to `prescription/[id]`).

**Each finding card:**
- Severity stripe + title + **severity pill with the word spelled out**.
- Optional mono subtitle, text detail.
- "Unreviewed" or "Overridden" pill if applicable (content pending
  pharmacist review, or marked rejected-but-visible).
- If it's an interaction or condition finding, "Alternatives to [drug]"
  buttons for each drug involved.

**Empty state** (within each cut): green stripe, "No findings in this
category" — collapses to a single line, doesn't take up a full card's
worth of space.

---

## Block E · Groups (organizational, no clinical meaning)

### E.1 · Group detail
**Route:** `app/grupo/[id].tsx`

**Layout:**
1. Header with the group's name and an edit pencil on the right (absent
   for "no group," which is a reserved id with no row of its own).
2. Summary: composition bar (same as in the Groups list) + text with the
   total and how many have a severe finding.
3. List of the group's patients, same row format as Patients (stripe,
   name, age, Clcr).
4. Empty state if the group has no patients.

---

### E.2 · Edit/delete group
**Route:** `app/grupo/[id]/editar.tsx`

**Layout:** one field (name) + Save button (disabled if nothing changed).
Below it, a neutral notice ("patients aren't deleted, they just lose their
group") and a destructive "Delete group" button with native confirmation.

---

### E.3 · Create group
**Route:** `app/crear-grupo.tsx`

**Layout:** one text field + "Create group" button. The simplest screen in
the whole app.

---

## Block F · Individual prescription

### F.1 · Edit/discontinue/delete a prescription
**Route:** `app/prescripcion/[id].tsx`

**Layout:**
1. **Regimen block · Required** — titled with the drug's name: Dosage,
   Frequency (one row), Route (chips).
2. **"Estado" ("Status") block** — Active/Discontinued/Finished chips. If
   not Active, a note: "stops entering the checks, but stays on record"
   (a key distinction: discontinuing ≠ deleting).
3. "Save changes" button.
4. **Danger zone**: notice ("deleting is for something entered by
   mistake") + red "Delete prescription" button with confirmation.

---

## Block G · Drug sheet (catalog, no patient attached) and its 6 sub-screens

### G.1 · Drug sheet
**Route:** `app/farmaco/[id].tsx`

**Why it exists:** the drug's reference sheet — general restrictions for
the drug itself (not checked against any specific patient) plus its
descriptive monograph. This is where the free-plan per-lookup wall lives
(10 free, then paid).

**Layout:**
1. Header: light-green background, name + dosage large, dosage form +
   manufacturer, active-ingredient chips.
2. **4-restriction grid** (pregnancy, lactation, renal, hepatic) — ALWAYS
   all four, even without data ("No data" in gray). Tapping one may open a
   quota-consumption confirmation sheet before navigating (see below).
3. A separate "Interactions" row, apart from the grid (it's not a
   restriction against a patient state — it's the drug against other
   drugs): count + chevron.
4. **Free-lookup counter** (only shown when the backend flags that few
   remain): cyan strip with an icon, "You have N free lookups left.
   Revisiting one you've already seen doesn't use another."
5. **"Composición" ("Composition")**: list of active ingredients with
   their therapeutic group.
6. **"Familia para alergias" ("Allergy family")** (if applicable): family
   name + a note on when it requires confirmation.
7. **"Monografía" ("Monograph")** — a section **index** (Dosage,
   Interactions, Contraindications, Precautions, Pregnancy, Lactation,
   Adverse reactions, Indications, Description), each row with its own
   icon seal + title + one-line caption + chevron. Only sections that
   actually have text appear — never an empty row. If there's no
   monograph loaded at all, a notice says so explicitly.

**Quota-confirmation sheet:** the first time in a session you tap one of
the 5 gated views (pregnancy/lactation/renal/hepatic/interactions), if it
consumes one of the 10 free lookups, a bottom sheet opens: "Viewing
[restriction] uses one of your N" + "View it, and use one" / "Not now."
Returning to the same screen for the same drug doesn't ask again.

---

### G.2 · Restriction: Pregnancy (no patient)
**Route:** `app/farmaco/[id]/embarazo.tsx`

**Layout:** a restriction header (icon + title + verdict + color) and
below it a **3-trimester timeline**: a horizontal bar split into 3 segments
whose width is proportional to the weeks, colored by severity, with the
trimester number above; below that, one detail row per trimester with a
name + label + the alert's text (or "No alert entered for this stretch").
An "Unreviewed" pill where it applies. Footer noting that with a patient
loaded, this narrows down to a single trimester.

---

### G.3 · Restriction: Lactation (no patient)
**Route:** `app/farmaco/[id]/lactancia.tsx`

**Layout deliberately different from the other 3** — lactation has no
gradient (there are no bands): a single, large, centered card, with a
color-circled icon, a mono status label, the alert's full text centered,
and — if there is an alert — two side-by-side comparison boxes
("Breastfeeding: the alert applies" / "No, or no data: stays neutral").

---

### G.4 · Restriction: Renal function (no patient)
**Route:** `app/farmaco/[id]/renal.tsx`

**Layout:** header + **Clcr band scale** (the `EscalaRenal` component):
vertical axis with numeric ranges on the left, a dot-and-line connecting
the bands toward the center, and on the right a **horizontal bar per band
that IS the remaining dose** — solid up to the range's minimum,
translucent up to its maximum (never inventing an average). A note below
each bar only with what the percentage alone doesn't already say. Can
repeat once per active ingredient in the product.

---

### G.5 · Restriction: Hepatic function (no patient)
**Route:** `app/farmaco/[id]/hepatico.tsx`

**Layout:** header + **3-step staircase** (Child-Pugh A/B/C), drawn from
the bottom (A, mild) up to the top (C, severe), each step offset further
right than the previous one. All three currently render **always empty**
(dotted outline, no fill) because no per-drug hepatic adjustment table
exists in the catalog yet — they're shown anyway, to say "the question
exists, the answer is missing" instead of hiding it.

---

### G.6 · Restriction: Interactions (no patient)
**Route:** `app/farmaco/[id]/interacciones.tsx`

**Layout:** grouped by **rule**, not a flat list (a drug like lithium can
have 26 interactions sharing the exact same text — listing them loose
would repeat the sentence 26 times). Each group:
- The rule card itself: severity + "with how many drugs" + the rule's
  text.
- "What it interacts with" — sub-grouped by **therapeutic family** (name +
  count + chips with the first 6 members and "and N more"), with the ones
  that have no family in an "Others" block at the end.

No severity is instantiated against any specific patient here — that only
exists in the cockpit.

---

### G.7 · Monograph section
**Route:** `app/farmaco/[id]/monografia/[seccion].tsx`

**Why it exists:** shows the drug's actual descriptive text (dosage,
contraindications, etc.), split by section so the relevant one can be
found without reading everything. It's the only drug screen that computes
nothing — it doesn't consume a lookup quota.

**Layout:**
1. Header: a large icon seal for the section + title + the names of the
   active ingredients this text belongs to (if the product is a
   combination drug, there can be more than one).
2. The text, split into sentences and presented as a list of lines — not
   one running paragraph — so it can be scanned rather than read
   start-to-finish. If a line has the shape "Label: a, b, c" (common in
   interaction listings), it opens into a mini-card with the label as its
   title and each item as its own chip, instead of running text.
3. If the product has more than one active ingredient with text for that
   section, both are shown, each with its own subtitle.
4. Footer note: this content is descriptive, and whatever gets checked
   against the patient lives in the drug sheet's restrictions/interactions
   instead.

A single accent color across the whole screen (the brand green) — never
the clinical scale, since there's no patient or severity involved here.

---

## Block H · The 6 standalone tools (no patient)

They share a two-state skeleton — **Query** (form) and **Result**— never
mixed in the same scroll. Every catalog-crossing tool also has a
"collapsed" header in the result view summarizing what was asked and with
what data, with a "Change" button to go back and edit without losing what
was entered.

### H.1 · Interactions (cross-check N drugs)
**Route:** `app/herramientas/interacciones.tsx`

**Query:** multi-select active-ingredient search (chips with an "×" to
remove). The button states how many pairs it's about to analyze
("Analyze 6 pairs").

**Result:** verdict with the worst finding, grouped by severity (same
pattern as the rest: group header with a colored dot + count, cards with a
colored stripe, "A + B" title, the rule's text). Footer notice clarifying
that "no known interaction" isn't the same as "safe."

---

### H.2 · Condition and allergy (1 candidate drug)
**Route:** `app/herramientas/condicion-alergia.tsx`

**Query:** a 1-drug search field + a filterable condition picker (chips,
with search if the catalog is large) + a filterable allergy-family picker
+ the chosen allergy's severity (chips), with a note on the blocking rule.

**Result:** verdict (can be "Cannot be prescribed" if it blocks) +
condition-alert cards + allergy cards (exact match / family cross-match,
with the explicit consequence) + a notice if no gestational week is on
file.

---

### H.3 · Renal adjustment (N drugs against a Clcr)
**Route:** `app/herramientas/renal.tsx`

**Query:** multi-drug search + "I have the Clcr" (direct field) / "Compute
it" (age+weight+creatinine+sex) chips.

**Result:** a verdict with the Clcr as a **large figure** (not a colored
dot) + KDIGO grade + how many of the drugs need adjustment at that range.
Rows sorted by severity, each with: the applicable Clcr range,
recommendation, normal dose, dialysis supplement if applicable, a notice
if it's "above the table's ceiling" or if the source flagged the row for
review. With no table in the catalog: an explicit message that absence
doesn't mean "no adjustment needed."

---

### H.4 · Hepatic adjustment (standalone Child-Pugh)
**Route:** `app/herramientas/hepatico.tsx`

A one-line wrapper around the shared `Calculadora` component (see 3.6
below) — nothing to save (it's discardable), no formula to compute (the
result is a score from adding up the points of each chosen band).

---

### H.5 · Creatinine clearance
**Route:** `app/herramientas/clcr.tsx`

**Layout:** a single block with Age/Weight/Creatinine (one row) + Sex
(chips), and below it **the result ring appearing live** while typing
(never hidden behind a "Calculate" button). If a value breaks the formula,
the ring states exactly which field and why, distinct from "you haven't
typed anything yet." Footer with two fixed notices: what the formula is,
and that this number alone doesn't say how much to adjust any given drug.

Along with LDL, this is one of the two fully-free calculators (a published
1976 formula) — what's paid is crossing it against the catalog, which
lives in tool H.3.

---

### H.6 · LDL cholesterol
**Route:** `app/herramientas/ldl.tsx`

**Layout:**
1. A card with a unit selector (mg/dL · mmol/L) at the top right + three
   fields (Total, HDL, Triglycerides).
2. **Two figures side by side, always both** (LDL-C and non-HDL-C) — one
   can go blank without the other (if Friedewald doesn't apply due to high
   triglycerides, non-HDL is still valid).
3. The formula used, in mono, or **the exact reason it couldn't be
   computed** (missing data — states which — vs. triglycerides too high vs.
   values that don't reconcile). Never a generic "not applicable."
4. Collapsible "Other LDL-C formulas" panel (alternate Friedewald,
   Martin-Hopkins, etc.) — auto-expands when the primary one couldn't be
   computed.
5. Fixed notice: "What this doesn't tell you" — LDL is one risk factor
   among several.

---

## Block I · The 11 Profile sub-screens

### I.1 · Personal data
**Route:** `app/perfil/cuenta.tsx`
Form: First + last name (one row), Email. A separate block showing the
username in mono, not editable (changing it would break
sessions/references). Save button.

### I.2 · Change password
**Route:** `app/perfil/password.tsx`
Current password, New, Confirm. Neutral notice: changing it closes ALL
sessions, including the current one (which is why confirming redirects to
Login).

### I.3 · Active sessions
**Route:** `app/perfil/sesiones.tsx`
A list of devices with a live session: icon + device name + a "This one"
pill if it's the current device + creation date. A "Log out" button per
row (absent on the current session — that's what "Log out" in the Profile
tab is for). Notice: if you don't recognize a device, log it out and
change your password.

### I.4 · Theme
**Route:** `app/perfil/tema.tsx`
The simplest screen: three chips (Light/Dark/System).

### I.5 · Notifications
**Route:** `app/perfil/notificaciones.tsx`
A single switch ("Receive alerts") + a note that it's saved on the
server, not on the phone.

### I.6 · Elderly threshold
**Route:** `app/perfil/umbral.tsx`
Age chips (60/65/70/75/80) + a clinical explanation of what this number
decides (from what age inappropriate-medication-in-the-elderly alerts
trigger).

### I.7 · Subscription (read-only)
**Route:** `app/perfil/suscripcion.tsx`
Status card (color + text + date + store). "See plans" button if it's not
active. Notice: everything is managed from the store, this screen only
reflects it.

### I.8 · Help & support
**Route:** `app/perfil/ayuda.tsx`
A static FAQ: 4 question/answer blocks (where recommendations come from,
why "draft," why hepatic adjustment is missing, what happens without a
Clcr).

### I.9 · Terms & privacy
**Route:** `app/perfil/legales.tsx`
Two documents on a single screen (previously two separate menu entries):
Terms and conditions (3 blocks) + a notice that this is preliminary text,
then Privacy policy (3 blocks) + a notice of what's still missing before
production.

### I.10 · About GFH
**Route:** `app/perfil/acerca.tsx`
Logo + full name + version (real, pulled from the package) + platform. A
source-attribution block for clinical sources (without naming Farmanuario
— non-negotiable rule #7) and a reminder of the zero-AI-at-runtime rule.

### I.11 · Delete account
**Route:** `app/perfil/eliminar-cuenta.tsx`
Text explaining the deletion with a **7-day grace period** (the explicit
number, not "a while") — reactivating is simply logging back in within
that window. Notice that after the window, everything is deleted with no
way back. Notice that an active subscription needs to be cancelled in the
store first. Password field to confirm. Red button with double
confirmation (native `Alert`).

---

# Part 4 — Cross-cutting notes for whoever redesigns this

1. **No redesign should "clean up" the four restriction cards down to only
   the ones with data.** Always showing all four, with or without data, is
   a deliberate clinical decision (rule #1 in section 1.5), not a design
   oversight.

2. **The bottom menu is not a native tab bar** — it's a custom component
   that lives outside the `Stack`, with a raised central button. Any
   navigation redesign needs to explicitly decide whether to keep that
   persistence (today it survives entering a patient, a drug sheet, any
   Stack screen) or change it — but that's a decision, not a detail.

3. **The three colors (clinical severity / count / property-cyan) aren't
   interchangeable** even when they can look similar. A redesign that
   merges them into one scale would break the distinction between "this is
   severe," "this is a lot," and "this drug has a table."

4. **The "mold" calculators** (Child-Pugh in its three appearances —
   standalone, patient-attached, and LDL/Clcr with their own shape) share a
   declarative component (`Calculadora` + `Molde` in `@gfh/shared-types`).
   A redesign of "what a calculator looks like" should probably be solved
   ONCE at that component's level, not screen by screen — it's already
   built that way in the code, and it's worth preserving.

5. **Empty, loading, and error states follow a single pattern**
   (`Estado`, `Skeleton*`, `ResultadoConsulta`). A coherent redesign
   probably wants to touch those 4-5 shared components and let the change
   propagate to all 53 screens on its own, rather than redesigning each
   state screen by screen.

6. **There's "not yet reviewed by a pharmacist" content in production on
   purpose** (the "Unreviewed" pill). It's not a development placeholder —
   it's a provenance marker that will keep existing once the app is
   finished, because fully validating thousands of drugs is ongoing work,
   not a one-time milestone.

7. **Nothing in the app calls a language model at runtime.** If the
   redesign imagines something like a conversational assistant or a
   generated summary, that breaks the project's non-negotiable rule #1 —
   it would need to be raised as a separate product decision, not folded
   into a visual redesign.
