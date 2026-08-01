# DM Toolkit

[![Live](https://img.shields.io/badge/live-gdr--sys.github.io%2Fdm--toolkit-crimson?style=flat-square)](https://gdr-sys.github.io/dm-toolkit/)
[![D&D 5e](https://img.shields.io/badge/D%26D-5e%202014%20%2F%202024-8B2635?style=flat-square)](https://gdr-sys.github.io/dm-toolkit/)
[![Vanilla JS](https://img.shields.io/badge/stack-Vanilla%20JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://gdr-sys.github.io/dm-toolkit/)
[![Firebase](https://img.shields.io/badge/sync-Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/game%20data-SRD%20OGL%2FORC-lightgrey?style=flat-square)](https://www.dndbeyond.com/srd)

Campaign management web app for D&D 5e Dungeon Masters (2014 and 2024 editions). Built to handle the full DM workflow — from session prep to live combat — on any device, with no installation required.

---

## Overview

| Area | Key features |
|---|---|
| Wiki | WYSIWYG editor, wikilinks, tags, visual graph, templates |
| World | NPCs, Locations, Factions with automatic Wiki sync |
| Sessions | Combat tracker, scene planner, session log, clocks |
| Compendium | SRD 5.1 + 5.2.1, homebrew, Wiki sync |
| DM Screen | Drag & drop layout, customizable blocks |
| Sync | Firebase realtime, local / anonymous / Google auth, or Google Drive backup |
| PWA | Installable on desktop and mobile, offline-capable |

---

## Features

### Wiki & Knowledge Base

Full WYSIWYG editor with formatting toolbar including heading levels, bold, italic, color, highlighter, and callout blocks. Notes support:

- **Bidirectional wikilinks** — `[[NPC Name]]`, `[[location:Castle]]`, `[[faction:Guild]]` with direct navigation to the linked entity
- **@mention** — type `@` anywhere in an editor to get an inline autocomplete picker for all campaign entities
- **Tags** — colored `#tags` with tag bar and filter
- **Automatic backlinks** — every note tracks what links to it
- **Visual graph** — d3-force node graph of all connections between entities; click a node to open it
- **Callout blocks** — Read Aloud, DM Secret, Loot, Clue, Trap, Improv
- **Templates** — Session, Lore, NPC, Location, Magic Item, Dungeon/Room, Event/Secret, Shop; custom templates supported
- Read-only / edit toggle, pinned notes, duplicate note, inline images via URL

Global search `Ctrl+K` covers notes, NPCs, locations, factions, and compendium — including field contents, not just titles.

### World & Wiki Sync

The World and Wiki stay in sync automatically and bidirectionally:

- Create an NPC in World → Wiki note generated with pre-filled structure and wikilinks
- Create a note from an NPC/Location template → corresponding entity created in World
- Rename an entity → all `[[links]]` across all notes updated automatically
- NPC card shows all Wiki notes that mention it, with direct navigation
- "Update World" button on a linked note pushes changes back to the entity
- Player Characters follow the same rule between the Party roster (Live Session) and the Wiki PG section: creating or editing a PC in either place updates the other

### World

NPC cards with full data: role, goals, DM secrets, morale, combat stats, relationships with other NPCs. Locations and factions with positionable images. Note/Description fields support rich formatting and wikilinks. Filter NPCs by status (alive, dead, missing, ally, enemy) and by faction.

### Sessions

**Scene Planner** — each session has its own sequence of beats (Opening, Combat, Social, Exploration, Revelation, Cliffhanger, Rest, Free). Beats are reorderable, include title and notes, and one can be marked as the main encounter. Beats are stored per session, not globally.

**Session Log** — full history of all campaign sessions. Each session stores: number, title, date, status (planned / active / played), involved NPCs, beats, prep notes, and post-session recap. One session can be set as active at a time; the Scene Planner reflects whichever session is currently active.

**Wiki integration** — each session in the log can generate a linked Wiki note with pre-filled structure (NPCs as wikilinks, beat list, recap section). Once created, the note is accessible directly from the session card.

**Combat tracker** — initiative, HP, AC, conditions, concentration with automatic save DC. Effects with round countdown that auto-decrement each turn. Short and Long Rest with automatic resets.

**Party** — player character roster with class, level, HP, AC, passive scores and inspiration, ready to drop into the combat tracker. Kept in sync with the Wiki PG section.

**Clocks** — progress trackers for rituals, chases, faction pressure, and other timed narrative elements.

### Storylines & Quests

**Storylines** — narrative threads grouped by category (Main Plot, Plot B/C, character arcs, subplots, mysteries) with status tracking (ongoing, completed, on hold, abandoned) and a rich-text body per thread.

**Quests** tracked in the Wiki alongside NPCs, Locations, and Factions, with wikilinks and full-text search.

### Compendium

SRD 5.1 and 5.2.1 monsters with normalized CR (including fractions 1/8, 1/4, 1/2). Magic items, equipment, spells, rules. Homebrew integrated natively. Wiki notes tagged `#item` or `#monster` sync automatically with the Compendium homebrew section. Favorites per campaign, full-text search, type and CR filters.

### DM Screen

Drag-and-drop grid layout with customizable blocks: party passive perceptions, quick dice, weather, conditions reference, combat mini-tracker, XP encounter calculator (2014/2024), in-game calendar, free notes. Combat tracker controls function from within the screen.

### Utilities

Always-accessible scratchpad in the topbar for in-session quick notes. PDF export of the full campaign (cover, NPCs, locations, factions, Wiki notes). JSON backup and restore per campaign or full data, with an optional automatic backup to the user's own Google Drive. 13 quick generators for improvisation at the table.

---

## Collaboration & Sync

Three modes, chosen at first login:

```
Local        ->  localStorage only. No account required.
Anonymous    ->  Firebase. Cloud storage, no credentials.
Google/Email ->  Firebase. Multi-device sync and real-time co-authors.
```

Anonymous accounts can be upgraded to Google at any time without data loss via Firebase `linkWithPopup`.

**Real-time collaboration**

Each campaign has a unique invite code. A co-author enters the code to access the same campaign on Firebase Realtime Database. Changes are pushed with a 2-second debounce. Merge strategy: Wiki notes use most-recent-wins per note; new NPCs are additive without overwriting locally-edited ones. Online presence is shown in the topbar.

**Google Drive backup**

An alternative to (or complement of) Firebase sync: campaigns are backed up as JSON files in a "DM Toolkit" folder on the user's own Google Drive, keeping Firebase usage light. Authentication uses a single shared, public OAuth Client ID configured for the live domain — users just click "Collega Drive" and pick their Google account, with no setup of their own required. Each user's backups stay private to their own Drive; the shared Client ID only identifies the app to Google, not the data.

---

## Installable app (PWA)

DM Toolkit can be installed as a standalone app — "Install app" in Chrome/Edge on desktop, or "Add to Home Screen" on iOS/Android. A service worker caches the app shell for offline use (network-first, so updates are always picked up when online) and the toolkit ships its own icon for the browser tab, the installed app, and the phone home screen.

---

## Tech stack

Single HTML file. No framework, no bundler, no NPM dependencies.

| Library | Purpose | Loading |
|---|---|---|
| Firebase 10 compat | Auth + Realtime Database | CDN (optional) |
| d3 v7 | Visual node graph | CDN |
| jsPDF 2.5 | PDF export | CDN |
| html2canvas 1.4 | Screenshots for PDF | CDN |
| SortableJS 1.15 | Drag & drop DM Screen | CDN |

---

## License

Game data from the D&D 5e System Reference Document (SRD), released under OGL and ORC licenses by Wizards of the Coast.
