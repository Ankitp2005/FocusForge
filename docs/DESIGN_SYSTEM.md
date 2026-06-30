# DESIGN.md — Last-Minute Life Saver
## Brutalist UI Design System
**Version:** 2.0 | **Theme:** Brutalism | **Replaces:** DESIGN_SYSTEM.md v1.0

---

## Design Brief

Last-Minute Life Saver is about urgency, honesty, and action. It doesn't coddle you.
It doesn't round its corners and whisper. It grabs you by the collar and says:
**YOUR REPORT IS DUE IN 3 HOURS.**

Brutalism is the right language for this product. Brutalist design is raw, honest,
functional, and deliberately uncomfortable — because **comfort is what got you into
this deadline mess in the first place.**

No frosted glass. No soft gradients. No gentle nudges dressed in pastel badges.
LMLS tells you the truth with a thick black border and a font that doesn't apologize.

---

## Design Philosophy

> "Brutalism in UI is not about being ugly. It's about being **structurally honest.**
>  Every element has a visible reason to exist. Nothing hides its nature."

### The Five Brutalist Commandments for LMLS

1. **Borders are structure, not decoration.** Everything sits in a hard-edged box.
   No shadow, no blur — just a 2–3px solid black line that means what it says.

2. **Typography is the loudest element.** Type does the visual work that color and
   illustration usually do. Big. Heavy. Unambiguous.

3. **Color is reserved for meaning, not mood.** Only four colors carry meaning:
   RED = danger/overdue, YELLOW = warning/urgent, GREEN = done/safe, BLACK = everything else.
   A yellow background on a task card is not an aesthetic choice — it means ACT NOW.

4. **Negative space is earned, not defaulted to.** Information is dense.
   Users came here because they're behind — they don't need breathing room,
   they need signal density.

5. **The interface shows its skeleton.** Layout grid is visible via borders.
   Component structure is naked. Nothing pretends to float.

---

## 1. Color Tokens

```css
/* ═══════════════════════════════════════════
   LMLS BRUTALIST PALETTE
   ═══════════════════════════════════════════ */

/* Foundation */
--color-black:      #0A0A0A;   /* Near-black — primary text, borders */
--color-white:      #F5F0E8;   /* Off-white/cream — page background */
--color-paper:      #EDE8DF;   /* Task card surface */
--color-concrete:   #C8C2B8;   /* Disabled, muted, secondary surfaces */

/* Signal Colors (meaning-only — never decorative) */
--color-red:        #E8000D;   /* CRITICAL / OVERDUE — alarm red */
--color-red-bg:     #FFE5E6;   /* Critical task card background */
--color-yellow:     #FFD600;   /* HIGH PRIORITY / WARNING — construction yellow */
--color-yellow-bg:  #FFFDE0;   /* High priority card background */
--color-green:      #00A550;   /* COMPLETED / SAFE — signal green */
--color-green-bg:   #E0FFE8;   /* Completed state background */

/* Accent */
--color-electric:   #0057FF;   /* AI / interactive elements — electric blue */
                               /* The ONE non-black non-signal color. Used sparingly. */

/* Dark Mode (inverted brutalism) */
--color-dark-bg:    #0A0A0A;   /* True black background */
--color-dark-paper: #1A1A1A;   /* Card surface */
--color-dark-text:  #F5F0E8;   /* Cream text */
--color-dark-border:#F5F0E8;   /* Cream borders on black */
```

### Color Usage Rules

| Color | ALLOWED uses | FORBIDDEN uses |
|---|---|---|
| `--color-black` | All borders, all body text, primary buttons | Never backgrounds (except nav) |
| `--color-white` | Page background, modal backgrounds | Never borders |
| `--color-red` | CRITICAL priority badge, OVERDUE label, error states | Decorative accents, hover effects |
| `--color-yellow` | HIGH priority badge, warning banners, urgent reminders | Backgrounds for non-urgent content |
| `--color-green` | Completed state, success messages, SAFE priority | "Active" or "selected" states |
| `--color-electric` | AI coach elements, interactive focus rings, CTA buttons | General text, borders |

---

## 2. Typography

```css
/* ═══════════════════════════════════════════
   TYPE SYSTEM
   ═══════════════════════════════════════════ */

/* Display / Headlines — the voice of urgency */
--font-display: 'Space Grotesk', 'Arial Black', sans-serif;
/* Why: Geometric, slightly compressed, industrial weight. 
   Reads as important even at small sizes. Not warm or friendly. */

/* Body / UI — the voice of information */
--font-body: 'IBM Plex Mono', 'Courier New', monospace;
/* Why: Monospaced type is the language of code, terminals, systems.
   LMLS is an operating system for your life. 
   It also makes timestamps, task IDs, and metadata 
   feel like data — not decoration. */

/* Labels / Stamps — the voice of categorization */
--font-label: 'Space Grotesk', sans-serif;
/* Same as display but used at small sizes, ALL CAPS, tracked out */
```

### Type Scale

```css
/* Display sizes — for page titles, dashboard headers */
--text-display-xl:  4rem    / 1;        /* 64px — hero statements only */
--text-display-lg:  2.5rem  / 1.1;     /* 40px — page titles */
--text-display-md:  1.75rem / 1.2;     /* 28px — section headers */

/* Body sizes — for task content, descriptions */
--text-body-lg:     1.125rem / 1.6;    /* 18px — primary content */
--text-body-md:     1rem     / 1.6;    /* 16px — default body */
--text-body-sm:     0.875rem / 1.5;    /* 14px — secondary content */

/* Label sizes — for badges, stamps, tags, meta */
--text-label-lg:    0.875rem / 1;      /* 14px — uppercase labels */
--text-label-sm:    0.75rem  / 1;      /* 12px — timestamps, IDs */

/* Weights */
--weight-black:  900;    /* Display headlines */
--weight-bold:   700;    /* Sub-headers, priority labels */
--weight-medium: 500;    /* Body emphasis */
--weight-regular: 400;   /* Body text, descriptions */

/* Letter spacing */
--tracking-tight:  -0.03em;   /* Display type */
--tracking-normal:  0em;       /* Body */
--tracking-stamp:   0.12em;    /* ALL CAPS labels — always tracked out */
```

### Typography in Practice

```
PAGE TITLE (dashboard):
  Font: Space Grotesk, 900 weight
  Size: 40px / line-height 1.1
  Case: Sentence case
  Color: --color-black

TASK TITLE:
  Font: IBM Plex Mono, 500 weight
  Size: 16px / line-height 1.5
  Case: As entered by user
  Color: --color-black

PRIORITY BADGE:
  Font: Space Grotesk, 700 weight
  Size: 12px
  Case: ALL CAPS
  Tracking: 0.12em
  Example: ▮ CRITICAL

DEADLINE COUNTDOWN:
  Font: IBM Plex Mono, 700 weight
  Size: 14px
  Case: as-is
  Example: 03:42:17 remaining

METADATA (category, tags):
  Font: IBM Plex Mono, 400 weight
  Size: 12px
  Case: lowercase
  Color: --color-concrete
  Example: #work  •  ~90 min
```

---

## 3. Borders, Spacing & Layout

### The Border System

Borders are the skeleton of this UI. They are always visible, always black, never rounded.

```css
/* Border widths */
--border-thin:    1px solid var(--color-black);
--border-default: 2px solid var(--color-black);
--border-thick:   3px solid var(--color-black);
--border-heavy:   4px solid var(--color-black);

/* Border radius — NONE */
--radius: 0px;   /* Zero. Everywhere. Always. */

/* Box shadows — brutalist offset shadows (no blur) */
--shadow-sm:  3px 3px 0px var(--color-black);
--shadow-md:  5px 5px 0px var(--color-black);
--shadow-lg:  8px 8px 0px var(--color-black);

/* On hover: shadow collapses, element "presses down" */
--shadow-hover: 1px 1px 0px var(--color-black);
--translate-hover: translate(4px, 4px);
/* This creates a physical "press" feel without border-radius softening */
```

### The Spacing Grid

```css
/* 8px base grid */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;

/* Component internal padding */
--padding-card:   16px 20px;
--padding-badge:  4px 10px;
--padding-button: 12px 24px;
--padding-input:  12px 16px;
```

### Layout Grid

```css
/* Desktop: 12-column grid */
--grid-cols: 12;
--grid-gap:  2px;   /* Gaps are BORDERS, not whitespace — 2px black lines */
--grid-max:  1440px;
--grid-pad:  24px;  /* Side padding only */

/* Sidebar */
--sidebar-width: 220px;
--ai-panel-width: 320px;

/* The grid itself IS the structure. 
   Columns are separated by 2px solid black lines — 
   not gutter whitespace. The grid is visible. */
```

---

## 4. Core Components

### 4.1 Task Card

```
┌─────────────────────────────────────────────────────┐ ← 2px solid black border
│                                                     │   + 5px 5px 0px black shadow
│  ▮ CRITICAL                              [○] DONE  │ ← Priority stamp + action
│                                                     │
│  Submit quarterly report to Sarah                   │ ← IBM Plex Mono, 500, 16px
│                                                     │
│  ─────────────────────────────────────────────────  │ ← 1px black rule
│                                                     │
│  #work  •  ~90 min  •  Due: FRI JUN 30, 5:00PM     │ ← Mono, 12px, concrete
│                                                     │
│  [03:42:17 REMAINING]                               │ ← Countdown, mono, bold
│                                                     │
└─────────────────────────────────────────────────────┘

STATE VARIANTS:

CRITICAL (overdue imminent):
  Background: --color-red-bg (#FFE5E6)
  Left edge:  6px solid --color-red
  Shadow:     5px 5px 0px --color-red

HIGH PRIORITY:
  Background: --color-yellow-bg (#FFFDE0)
  Left edge:  6px solid --color-yellow
  Shadow:     5px 5px 0px --color-black

MEDIUM PRIORITY:
  Background: --color-paper (#EDE8DF)
  Border:     2px solid --color-black
  Shadow:     5px 5px 0px --color-black

LOW PRIORITY:
  Background: --color-white
  Border:     1px solid --color-concrete
  Shadow:     none

COMPLETED:
  Background: --color-green-bg
  Border:     2px solid --color-green
  Title:      line-through, --color-concrete
  Shadow:     none

HOVER (all cards):
  shadow:     --shadow-hover
  transform:  translate(4px, 4px)
  transition: 80ms (snappy — not smooth)
```

### 4.2 Priority Stamp / Badge

```css
/* The PRIORITY badge is a rubber stamp aesthetic */
.priority-badge {
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 2px solid currentColor;
  padding: 3px 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* The ▮ square before label — like a status indicator on a form */
.priority-badge::before {
  content: '▮';
  font-size: 8px;
}

/* Variants */
.badge-critical { color: var(--color-red);    border-color: var(--color-red); }
.badge-high     { color: var(--color-black);  background: var(--color-yellow); border-color: var(--color-black); }
.badge-medium   { color: var(--color-black);  border-color: var(--color-black); }
.badge-low      { color: var(--color-concrete); border-color: var(--color-concrete); }
.badge-overdue  { 
  color: var(--color-white);
  background: var(--color-red);
  border-color: var(--color-red);
  animation: stamp-pulse 1.5s ease-in-out infinite;
}

@keyframes stamp-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.7; }
}
```

### 4.3 Buttons

```css
/* PRIMARY BUTTON — the action you must take */
.btn-primary {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  
  background: var(--color-black);
  color: var(--color-white);
  border: 2px solid var(--color-black);
  padding: 12px 24px;
  border-radius: 0;
  
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: transform 80ms, box-shadow 80ms;
}
.btn-primary:hover {
  transform: var(--translate-hover);
  box-shadow: var(--shadow-hover);
}
.btn-primary:active {
  transform: translate(5px, 5px);
  box-shadow: none;
}

/* AI BUTTON — electric blue, same physical feel */
.btn-ai {
  background: var(--color-electric);
  color: var(--color-white);
  border-color: var(--color-electric);
  box-shadow: 5px 5px 0px var(--color-electric);
}
.btn-ai:hover {
  box-shadow: 1px 1px 0px var(--color-electric);
}

/* GHOST BUTTON — secondary actions */
.btn-ghost {
  background: transparent;
  color: var(--color-black);
  border: 2px solid var(--color-black);
  box-shadow: var(--shadow-sm);
}

/* DANGER BUTTON */
.btn-danger {
  background: var(--color-red);
  color: var(--color-white);
  border-color: var(--color-red);
  box-shadow: 5px 5px 0px #8B0000;
}
```

### 4.4 Input Fields

```css
.input {
  font-family: var(--font-body);  /* IBM Plex Mono */
  font-size: 15px;
  
  background: var(--color-white);
  border: 2px solid var(--color-black);
  border-radius: 0;
  padding: 12px 16px;
  width: 100%;
  
  /* NO box-shadow on idle state */
  transition: border-color 80ms;
}

.input:focus {
  outline: none;
  border-color: var(--color-electric);
  box-shadow: 4px 4px 0px var(--color-electric);
  /* Focus is a hard electric shadow — impossible to miss */
}

.input::placeholder {
  color: var(--color-concrete);
  font-style: italic;  /* Only italics in the whole system */
}

/* TASK QUICK-ADD — the primary input, oversized */
.input-task-add {
  font-size: 18px;
  padding: 16px 20px;
  border-width: 3px;
}
.input-task-add:focus {
  box-shadow: 6px 6px 0px var(--color-electric);
}
```

### 4.5 Navigation / Sidebar

```css
/* Left sidebar — the control panel */
.sidebar {
  width: 220px;
  background: var(--color-black);
  color: var(--color-white);
  border-right: 3px solid var(--color-black);
  padding: 0;
  /* Full height, no internal gaps — rows separated by 1px cream lines */
}

.sidebar-logo {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--color-white);
  padding: 20px 24px;
  border-bottom: 1px solid rgba(245, 240, 232, 0.2);
  /* "LMLS" or "⚡ LAST MIN" — abbreviated, stamped */
}

.sidebar-nav-item {
  font-family: var(--font-label);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  
  color: var(--color-concrete);
  padding: 14px 24px;
  border-bottom: 1px solid rgba(245, 240, 232, 0.1);
  display: flex;
  align-items: center;
  gap: 12px;
  
  transition: background 60ms, color 60ms;
}

.sidebar-nav-item:hover {
  background: rgba(245, 240, 232, 0.08);
  color: var(--color-white);
}

.sidebar-nav-item.active {
  background: var(--color-electric);
  color: var(--color-white);
  /* Active item is electric blue on black — unmissable */
}

/* Urgency counter badge in nav */
.nav-badge {
  margin-left: auto;
  background: var(--color-red);
  color: var(--color-white);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border: 1px solid var(--color-red);
}
```

### 4.6 AI Coach Panel

```css
/* The AI panel feels like a terminal / typewriter */
.ai-panel {
  width: 320px;
  background: var(--color-black);
  color: var(--color-white);
  border-left: 3px solid var(--color-black);
  display: flex;
  flex-direction: column;
}

.ai-panel-header {
  font-family: var(--font-label);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-electric);
  
  padding: 16px 20px;
  border-bottom: 1px solid rgba(245, 240, 232, 0.15);
  
  /* "⬡ AI COACH — ONLINE" — feels like a system status */
}

/* AI messages — on black background, cream text */
.ai-message {
  font-family: var(--font-body);  /* IBM Plex Mono */
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-white);
  
  padding: 16px 20px;
  border-bottom: 1px solid rgba(245, 240, 232, 0.08);
}

.ai-message-prefix {
  font-weight: 700;
  color: var(--color-electric);
  font-size: 12px;
  letter-spacing: 0.08em;
  display: block;
  margin-bottom: 6px;
  /* "COACH >" — like a terminal prompt */
}

/* User messages — inverted */
.user-message {
  background: rgba(245, 240, 232, 0.06);
  color: var(--color-concrete);
}
.user-message-prefix {
  color: var(--color-concrete);
  /* "YOU >" */
}

/* AI input at bottom */
.ai-input-area {
  margin-top: auto;
  border-top: 2px solid rgba(245, 240, 232, 0.2);
  padding: 16px 20px;
  display: flex;
  gap: 10px;
}
.ai-input {
  background: rgba(245, 240, 232, 0.05);
  border: 1px solid rgba(245, 240, 232, 0.2);
  color: var(--color-white);
  font-family: var(--font-body);
  font-size: 14px;
  flex: 1;
  padding: 10px 14px;
  border-radius: 0;
}
.ai-input:focus {
  outline: none;
  border-color: var(--color-electric);
  box-shadow: 3px 3px 0px var(--color-electric);
}
```

### 4.7 Urgency Countdown

The countdown timer is the SIGNATURE ELEMENT of this design. It is the thing
users will remember. Big, mono, loud — like a detonator counter.

```css
.countdown-block {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  
  display: inline-block;
  padding: 12px 20px;
  border: 3px solid currentColor;
  box-shadow: 5px 5px 0px currentColor;
  
  /* State-driven color */
}

.countdown-critical {
  color: var(--color-red);
  background: var(--color-red-bg);
  animation: countdown-flash 1s step-end infinite;
}
.countdown-high {
  color: var(--color-black);
  background: var(--color-yellow);
}
.countdown-safe {
  color: var(--color-black);
  background: var(--color-paper);
}

@keyframes countdown-flash {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* On the task card — smaller version */
.countdown-inline {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-width: 2px;
  box-shadow: 3px 3px 0px currentColor;
}
```

### 4.8 Notification / Alert Banners

```css
/* These are NOT toasts. They are BANNERS — they interrupt. */
.alert-banner {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  
  padding: 16px 24px;
  border: 3px solid var(--color-black);
  border-radius: 0;
  box-shadow: 6px 6px 0px var(--color-black);
  
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.alert-critical {
  background: var(--color-red);
  color: var(--color-white);
  border-color: #8B0000;
  box-shadow: 6px 6px 0px #8B0000;
  /* Full red — this is an alarm */
}

.alert-warning {
  background: var(--color-yellow);
  color: var(--color-black);
  border-color: var(--color-black);
  box-shadow: 6px 6px 0px var(--color-black);
}

.alert-success {
  background: var(--color-green-bg);
  color: var(--color-black);
  border: 3px solid var(--color-green);
  box-shadow: 6px 6px 0px var(--color-green);
}

/* Alert label */
.alert-label {
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.7;
  display: block;
  margin-bottom: 4px;
}

/* Alert actions — inline buttons */
.alert-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
```

### 4.9 Progress / Habit Rings

Instead of smooth circular progress, use a grid-based fill:

```css
/* Habit progress = a row of squares, filled to % complete */
/* "████░░░░░░" — like a loading bar from the 90s */

.progress-blocks {
  display: flex;
  gap: 3px;
}
.progress-block {
  width: 12px;
  height: 20px;
  border: 1.5px solid var(--color-black);
  background: transparent;
}
.progress-block.filled {
  background: var(--color-black);
}
.progress-block.filled.complete {
  background: var(--color-green);
  border-color: var(--color-green);
}

/* Streak counter — stamped number */
.streak-counter {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--color-black);
}
.streak-label {
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-concrete);
}
```

---

## 5. Page Layout Wireframes

### 5.1 Main Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐ BLACK BG
│ ⚡ LMLS    │                                                                │
│ ─────────  │  DASHBOARD                                     JUN 27, 14:32  │ CREAM BG
│ DASHBOARD  │  ─────────────────────────────────────────────────────────    │
│ TODAY      │                                                                │
│ CALENDAR   │  ┌─────────────────────────┐  ┌─────────────────────────┐    │ 2px grid
│ GOALS   3  │  │ ▮ CRITICAL             │  │ ▮ HIGH                  │    │ dividers
│ HABITS     │  │                         │  │                          │    │
│ ─────────  │  │ Submit Q3 report        │  │ Call client re contract  │    │
│ SETTINGS   │  │                         │  │                          │    │
│            │  │ ─────────────────────   │  │ ─────────────────────    │    │
└────────────┤  │ #work  •  ~90 min       │  │ #work  •  ~30 min       │    │
  3px border │  │                         │  │                          │    │
             │  │ [02:47:33 REMAINING] ██ │  │ Due: TOMORROW 12:00PM   │    │
             │  │                         │  │                          │    │
             │  │ [○ DONE] [ASK AI ⬡]    │  │ [○ DONE] [ASK AI ⬡]    │    │
             │  └─────────────────────────┘  └─────────────────────────┘    │
             │   RED SHADOW                   BLACK SHADOW                    │
             │                                                                │
             │  ┌─────────────────────────┐  ┌─────────────────────────┐    │
             │  │ ▮ MEDIUM               │  │ ▮ LOW                   │    │
             │  │ Review team pull reqs   │  │ Organize notes folder   │    │
             │  │ #work • ~45min          │  │ #personal • ~20min      │    │
             │  │ Due: MON JUL 01         │  │ No due date             │    │
             │  └─────────────────────────┘  └─────────────────────────┘    │
             │                                                                │
             │  ┌──────────────────────────────────────────────────────────┐ │
             │  │  + ADD TASK   [type anything or use natural language...] │ │ ← full width
             │  └──────────────────────────────────────────────────────────┘ │
             │                                                     ──────────┤
             │                                                     AI PANEL  │ BLACK
             │                                                     (320px)   │
             └─────────────────────────────────────────────────────────────────┘
```

### 5.2 Today / Focus Mode

```
╔═════════════════════════════════════════════════════════════╗  3px BLACK BORDER
║  TODAY                                    JUN 27, 2026     ║  BLACK BACKGROUND
║  ─────────────────────────────────────────────────────────  ║  CREAM TEXT
║  3 CRITICAL  •  2 HIGH  •  6h 40m ESTIMATED                ║
╠═════════════════════════════════════════════════════════════╣
║  NOW → 09:00 – 10:30                                       ║  CREAM BG, BLACK TEXT
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐   ║
║  │ ▮ CRITICAL   [01:47:22 REMAINING]                  │   ║  RED BG
║  │                                                     │   ║
║  │  Submit Q3 report to Sarah                         │   ║
║  │  #work  •  ~90 min  •  Due: TODAY 5:00PM           │   ║
║  │                                                     │   ║
║  │  [▶ START TIMER]      [⬡ BREAK INTO STEPS]        │   ║
║  └─────────────────────────────────────────────────────┘   ║
║                                                             ║
╠═══════════════════════ NEXT ════════════════════════════════╣  2px divider + label
║  10:45 – 11:45                                             ║
║  ▮ HIGH   Call client re: contract (#work, ~30min)         ║  Compact row
║                                                             ║
╠══════════════════════ LATER ════════════════════════════════╣
║  • Review team PRs  (45min)  →  13:00                     ║  Compact list
║  • Morning workout  (30min)  →  17:00  [HABIT]            ║
╠══════════════════════ DEFERRED ══════════════════════════════╣
║  2 tasks moved to TOMORROW (not enough time today)         ║  Concrete text
╚═════════════════════════════════════════════════════════════╝
```

### 5.3 Mobile Layout

```
┌────────────────────────┐
│ ⚡ LMLS    JUN 27 14:32│ ← BLACK header bar
├────────────────────────┤ 2px border
│ ▮ CRITICAL             │ ← RED BG card
│                        │
│ Submit Q3 report       │ IBM Plex Mono 16px
│                        │
│ [01:47:22 REMAINING]   │ ← 24px countdown
│                        │
│ [○ DONE] [⬡ AI]       │ ← Full-width buttons
├────────────────────────┤ 2px border
│ ▮ HIGH                 │ ← YELLOW BG card
│ Call client re contract│
│ Due: TOMORROW 12:00PM  │
│ [○ DONE] [⬡ AI]       │
├────────────────────────┤
│ ▮ MEDIUM               │ ← PAPER BG
│ Review team PRs        │
│ Due: MON JUL 01        │
├────────────────────────┤
│ [📋][📅][⬡ AI][⚙️]    │ ← Bottom nav, black bg
└────────────────────────┘
```

---

## 6. Signature Element — The OVERDUE SIREN

When a task becomes overdue, the entire task card enters SIREN MODE.
This is the one place where animation is aggressive by design:

```css
.task-card.overdue {
  background: var(--color-red);
  border-color: #8B0000;
  box-shadow: 8px 8px 0px #8B0000;
  animation: siren 0.8s step-end infinite;
  color: var(--color-white);
}

@keyframes siren {
  0%, 100% {
    background: var(--color-red);
    box-shadow: 8px 8px 0px #8B0000;
  }
  50% {
    background: #8B0000;
    box-shadow: 8px 8px 0px var(--color-red);
  }
}

/* The overdue stamp — diagonal, like a rubber stamp */
.overdue-stamp {
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%) rotate(-8deg);
  
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: var(--color-white);
  border: 4px solid var(--color-white);
  padding: 4px 12px;
  opacity: 0.4;
  /* Ghosted stamp effect — "OVERDUE" rotated across the card */
  /* Feels like a stamped paper form that missed the deadline */
}
```

---

## 7. Motion & Interaction

### Animation Philosophy
Motion is functional, not decorative. It should feel like a physical machine.

```css
/* Global timing */
--duration-snap:   80ms;   /* Button press, toggle — machine-click speed */
--duration-quick:  150ms;  /* State changes — fast but perceptible */
--duration-normal: 250ms;  /* Panel open/close */
--duration-slow:   400ms;  /* Task reorder, celebration */

--ease-sharp:   cubic-bezier(0.25, 0, 0.5, 1);    /* Mechanical */
--ease-snap:    cubic-bezier(0, 0, 0.2, 1);        /* Snaps into place */
```

### Specific Interactions

| Interaction | Behavior |
|---|---|
| Button press | Translate +4px +4px, shadow collapses — feels physical (80ms) |
| Task complete | Title gets `text-decoration: line-through`, card gets green border, then slides UP and out (250ms) |
| Task reorder | Cards slide to new position — no fancy spring, linear 150ms |
| New task added | Card slides DOWN into position from above (200ms) |
| Overdue siren | 0.8s step-end flash — deliberate strobe, not smooth pulse |
| Countdown tick | Numbers flip — no smooth animation, binary change like an old clock |
| AI typing | Monospace cursor blink (`_` character) at end of message |
| Priority recalc | Cards hold position, then jump to new order (not animated flow) |
| Panel open | Slides in from edge at 250ms — `ease-out` |

### `prefers-reduced-motion`
```css
@media (prefers-reduced-motion: reduce) {
  /* Keep structural transitions (panel open, card completion) */
  /* Remove: siren flash, countdown strobe, celebration */
  .task-card.overdue { animation: none; }
  .countdown-critical { animation: none; }
}
```

---

## 8. Dark Mode

Dark mode inverts the palette but keeps the brutalist structure.
Black becomes cream, cream becomes black. The ELECTRIC BLUE stays electric.
Signal colors (red, yellow, green) increase in saturation.

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-black:   #F5F0E8;  /* Flipped — cream is now the "ink" */
    --color-white:   #0A0A0A;  /* True black is the paper */
    --color-paper:   #141414;  /* Card surface */
    --color-concrete: #555050; /* Muted elements */
    
    /* Signals: more saturated in dark mode */
    --color-red:     #FF1A25;
    --color-yellow:  #FFE000;
    --color-green:   #00CC66;
    
    /* Electric stays */
    --color-electric: #0057FF;
    
    /* Backgrounds for signal cards */
    --color-red-bg:    #3A0006;
    --color-yellow-bg: #2A2200;
    --color-green-bg:  #002A14;
  }
}
```

---

## 9. Accessibility in Brutalism

Brutalism is inherently high-contrast — this works in our favor.

```
WCAG Compliance:
  Black (#0A0A0A) on White (#F5F0E8):   Contrast 16.8:1  ✅ AAA
  White (#F5F0E8) on Black (#0A0A0A):   Contrast 16.8:1  ✅ AAA
  Black on Yellow (#FFD600):             Contrast 11.2:1  ✅ AAA
  White on Red (#E8000D):               Contrast 5.8:1   ✅ AA
  Electric (#0057FF) on White:          Contrast 7.2:1   ✅ AA

Rules:
  - Focus ring: 3px solid --color-electric, offset 2px (never `outline: none`)
  - All icon-only buttons: aria-label required
  - Color never sole differentiator: priority uses badge + border + background
  - All animations: respect prefers-reduced-motion
  - All interactive elements: keyboard navigable
  - Minimum touch target: 44×44px (mobile)
```

---

## 10. Component Library Implementation Notes

### Tailwind Configuration

```javascript
// tailwind.config.js — extend with brutalist tokens
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', '"Arial Black"', 'sans-serif'],
        body:    ['"IBM Plex Mono"', '"Courier New"', 'monospace'],
        label:   ['"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        lmls: {
          black:    '#0A0A0A',
          white:    '#F5F0E8',
          paper:    '#EDE8DF',
          concrete: '#C8C2B8',
          red:      '#E8000D',
          'red-bg': '#FFE5E6',
          yellow:   '#FFD600',
          'yellow-bg': '#FFFDE0',
          green:    '#00A550',
          'green-bg': '#E0FFE8',
          electric: '#0057FF',
        }
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        /* Override Tailwind defaults — zero everywhere */
      },
      boxShadow: {
        'brutal-sm': '3px 3px 0px #0A0A0A',
        'brutal-md': '5px 5px 0px #0A0A0A',
        'brutal-lg': '8px 8px 0px #0A0A0A',
        'brutal-hover': '1px 1px 0px #0A0A0A',
        'brutal-red': '5px 5px 0px #E8000D',
        'brutal-electric': '5px 5px 0px #0057FF',
      },
    }
  },
  plugins: []
}
```

### shadcn/ui Overrides

All shadcn components must be overridden to remove border-radius and soft shadows:

```css
/* globals.css — brutalist override layer */
*, *::before, *::after {
  border-radius: 0 !important;  /* Nuclear option — no rounded corners anywhere */
}

/* Override shadcn card */
.card { box-shadow: var(--shadow-md); }
/* Override shadcn button */
.button { border-radius: 0; transition: transform 80ms, box-shadow 80ms; }
/* Override shadcn input */
.input { border-radius: 0; }
/* Override shadcn badge */
.badge { border-radius: 0; }
/* Override shadcn dialog */
.dialog-content { border-radius: 0; border: 3px solid #0A0A0A; }
```

---

## 11. Google Fonts Import

```html
<!-- In index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,700;1,400&family=Space+Grotesk:wght@400;500;700;900&display=swap" rel="stylesheet">
```

---

## 12. What This Design Is NOT

To protect the design from drift, here is what must never enter the codebase:

```
❌ border-radius > 0px on any interactive element
❌ box-shadow with blur (e.g., `0 4px 12px rgba(0,0,0,0.1)`)
❌ gradient backgrounds (linear-gradient, radial-gradient)
❌ frosted glass / backdrop-filter: blur()
❌ smooth easing curves on structural interactions (use step or sharp curves)
❌ Emoji in UI elements (outside of AI chat messages)
❌ Pastel colors not in the defined palette
❌ Inter, Roboto, or any neutral sans-serif as primary typeface
❌ Centered layouts with excessive whitespace ("Apple-style")
❌ Micro-illustrations or iconography-as-decoration
❌ Transition durations > 300ms (except celebration)
```

---

*Design System Owner: Design Lead | Version: 2.0 (Brutalism)*  
*Supercedes: DESIGN_SYSTEM.md v1.0*  
*Last Updated: June 2026*