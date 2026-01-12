# Guitar Practice TUI - Development Notes

This document captures the development history, architecture decisions, and implementation details for future reference.

## Project Purpose

A terminal UI to streamline creating guitar practice sessions in Notion. The Notion UI requires multiple clicks to create a session and add practice items - this TUI makes it a single workflow: browse library → select items → create session.

## Notion Database Structure

Three related databases work together:

### Practice Library
- **Purpose**: Master list of songs, exercises, and lessons
- **Key fields**: Name (title), Type (Song/Exercise/Course Lesson), Artist, Tags, Frequency, Current (checkbox)
- **Data Source ID**: `2d709433-8b1b-804c-897c-000b76c9e481`
- **Database ID**: `2d7094338b1b80ea8a42f746682bf965`

### Practice Sessions
- **Purpose**: Date-based containers for practice sessions
- **Key fields**: Session (title), Date, Practice Logs (relation)
- **Data Source ID**: `f4658dc0-2eb2-43fe-b268-1bba231c0156`
- **Database ID**: `7c39d1ff5e2e4458be4c5cded1bc485d`
- **Template ID**: `2d7094338b1b8030a56fcca068c6f46c` (includes linked database view)

### Practice Logs
- **Purpose**: Junction table linking library items to sessions with time tracking
- **Key fields**: Name (title), Item (relation to Library), Session (relation to Sessions), Planned Time (min)
- **Data Source ID**: `2d709433-8b1b-809b-bae2-000b1343e18f`
- **Database ID**: `2d7094338b1b80bf9e69fd78ecf57f44`

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) - Fast JavaScript runtime
- **UI Framework**: [OpenTUI](https://github.com/anomalyco/opentui) - Terminal UI with React reconciler
- **Notion Client**: [@notionhq/client v5](https://github.com/makenotion/notion-sdk-js) - Official SDK
- **Search**: [Fuse.js](https://fusejs.io/) - Client-side fuzzy search

### Why OpenTUI?
Evaluated several options:
- Python + Textual (richest UI, but different ecosystem)
- Go + Bubble Tea (stable, single binary)
- TypeScript + Ink (familiar but less rich)
- **OpenTUI** (chosen) - TypeScript/React, powers [opencode](https://github.com/anomalyco/opencode) with 62k stars

## Notion API v5 Quirks

The Notion SDK v5 (API version 2025-09-03) has important distinctions:

### Two Types of IDs
1. **Data Source IDs** (collection IDs) - Used for `dataSources.query()`
2. **Database IDs** (from URLs) - Used for `pages.create()`

These are different! Using the wrong ID type causes "database not found" errors.

### Query vs Create
```typescript
// Querying uses data source ID
notion.dataSources.query({ data_source_id: "..." })

// Creating uses database ID
notion.pages.create({ parent: { database_id: "..." } })
```

### Template Support
Pages can be created from database templates:
```typescript
notion.pages.create({
  parent: { database_id: "..." },
  properties: { ... },
  template: {
    type: "template_id",
    template_id: "...",
  },
})
```

## Key Implementation Details

### File Structure
```
src/
├── index.tsx          # Entry point, renderer setup
├── app.tsx            # Main component, keyboard handling, layout
├── config.ts          # Notion IDs and API key
├── types.ts           # Shared UI types (AppState, FocusArea)
├── components/
│   ├── LibraryPane.tsx    # Library list with search
│   ├── SessionsPane.tsx   # Session selector
│   └── SelectedPane.tsx   # Selected items panel
├── hooks/
│   ├── useNotionData.ts      # Data fetching, search, refresh
│   └── useSessionEditor.ts   # Selection state, save logic
└── notion/
    ├── client.ts      # Notion API functions
    └── types.ts       # Notion data types
```

### Session Create/Edit Flow

**Create New Session:**
1. Select "New Session" in Sessions panel (default)
2. Select items from Practice Library
3. Press `c` to create session
4. `createFullSession()` creates session + all logs

**Edit Existing Session:**
1. Navigate to Sessions panel (Tab)
2. Select an existing session
3. Logs are loaded into the Selected panel
4. Add/remove items, adjust times
5. Press `s` to save changes
6. Delta detection: only changed items are updated

### Focus Areas & Keyboard Navigation

Three panes: Library (with search), Sessions, Selected

| Focus Area | Keys | Actions |
|------------|------|---------|
| Library | j/k, ^f/^b, Space | Navigate, page up/down, select/deselect |
| Sessions | j/k, Space | Navigate, switch session |
| Selected | j/k, +/-, t, x, J/K | Navigate, adjust time, type time, remove, reorder |
| Search | typing, Esc | Filter library (inside Library pane) |

**Vim-style pane navigation:**
- `Ctrl+h` - Move to pane on the left
- `Ctrl+l` - Move to pane on the right
- `Ctrl+k` - Jump to search
- `Ctrl+j` - Jump from search back to list

**Other shortcuts:**
- `Tab` - Cycle focus through all areas
- `Esc` - Return to library list
- `/` - Quick jump to search
- `s` - Save session
- `r` - Refresh data from Notion

### Search
- Search input is inside the Library pane (top)
- Uses Fuse.js for fuzzy matching on name, artist, tags, type
- `onInput` (not `onChange`) for live filtering as you type
- Shows all items when search is empty

## Known Issues & Limitations

### tmux/Terminal Compatibility
Previously experienced SIGBUS crashes, initially attributed to tmux + OpenTUI incompatibility.
- GitHub issue: https://github.com/anomalyco/opentui/issues/490
- **Update (2026-01-12)**: Crashes were likely caused by old Bun version (1.0.25). Upgrading to Bun 1.3.5 resolved the issue. May now work in tmux - needs testing.

### No Pagination in UI
Shows max 20 items in library list, 10 sessions. Works fine for typical sizes but could add scrolling.

## Environment Setup

1. Create Notion integration at https://www.notion.com/my-integrations
2. Connect integration to the Guitar Songbook page (parent of all databases)
3. Copy API key to `.env` file:
   ```
   NOTION_API_KEY=ntn_...
   ```

## Future Ideas

- [x] ~~Configurable planned time per item~~ (done - use +/- in selected panel)
- [x] ~~Edit existing sessions~~ (done)
- [x] ~~Reorder items in session~~ (done - Shift+j/k in selected panel)
- [x] ~~Show item details (last practiced, times practiced)~~ (done - shown in Library pane)
- [ ] Filter by frequency (Daily/Weekly/Monthly)
- [ ] Filter by type (Song/Exercise/Course Lesson)
- [x] ~~Scrollable list for large libraries~~ (done - auto-scroll + Ctrl+f/b page)
- [ ] Session templates with preset items
- [ ] Quick-add from recent items
- [ ] Open item in Notion (Mac app preferred over browser)
- [ ] Enter actual time played (edit practice log after practice)
- [x] ~~Edit planned time by typing exact number~~ (done - press `t` in selected panel)

## Session Log

### 2026-01-12: Scrollable Library List
- Auto-scrolling window of 15 items, keeps cursor 3 items from edge
- Scroll indicators: "↑ N more" / "↓ N more"
- Page navigation: Ctrl+f (down 12), Ctrl+b (up 12)

### 2026-01-12: Show Item Details in Library
- Display last practiced date (📅 3d) and times practiced (🔄 12) with emoji
- Pipe separator between values in dimmer color
- Only shown when values > 0 (avoids React rendering stray `0`s)
- Helps decide what to practice based on history

### 2026-01-12: Edit Planned Time by Typing
- Press `t` in selected panel to enter time edit mode
- Type digits (1-999), Enter to confirm, Escape to cancel
- Visual feedback shows input value with yellow highlight

### 2026-01-12: Item Reordering
- Added `moveItem` function to `useSessionEditor` hook
- Shift+j/k (or J/K) to move items up/down in selected panel
- Cursor follows the moved item
- Added Order property to Practice Logs database for persistence
- Order saved/loaded via Notion API (manual drag order not accessible via API)

### 2026-01-12: Code Refactoring
- Extracted `LibraryPane`, `SessionsPane`, `SelectedPane` components
- Created `useNotionData` hook for data fetching, search, and refresh logic
- Created `useSessionEditor` hook for selection state and save logic
- Reduced `app.tsx` from 576 to 286 lines
- Added shared `types.ts` for UI state types
- Clean separation: components are presentational, hooks handle business logic

### 2026-01-12: UX Improvements
- Fixed SIGBUS crash by upgrading Bun from 1.0.25 to 1.3.5
- Changed save shortcut from `c` to `s` (more intuitive)
- Made save (`s`) and refresh (`r`) work globally from any pane
- Stay in place after save instead of showing "done" screen
- Moved search input inside Library pane (semantic grouping)
- Added vim-style pane navigation: `Ctrl+h/l` for left/right, `Ctrl+k/j` for search/list

### 2026-01-12: Session Editing Feature
- Added session selector panel showing recent sessions
- Implemented edit flow: select session → modify items → save
- Added Notion API functions: `fetchPracticeSessions`, `fetchPracticeLogsBySession`, `updatePracticeLog`, `deletePracticeLog`
- Delta detection on save: only creates/updates/deletes changed items
- Four-panel focus navigation with Tab cycling
- Time adjustment with +/- keys in selected panel
- Remove items with x key

### 2026-01-12: Initial Development
- Set up project with Bun and OpenTUI
- Implemented Notion API integration (fixed v5 API changes)
- Built browse/search/select UI
- Fixed keyboard shortcuts conflicting with search input
- Fixed live search (onInput vs onChange)
- Discovered and documented data source ID vs database ID distinction
- Added template support for Practice sessions
- Created GitHub repo at https://github.com/sohara/guitar-tui
