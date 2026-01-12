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
├── index.tsx      # Entry point, renderer setup
├── app.tsx        # Main React component, UI and state
├── config.ts      # Notion IDs and API key
└── notion/
    ├── client.ts  # Notion API functions
    └── types.ts   # TypeScript interfaces
```

### Session Creation Flow
1. User selects items from Practice Library
2. Press `c` to create session
3. `createFullSession()` is called:
   - Creates Practice Session page (using template for linked view)
   - Creates Practice Log entries for each selected item
   - Logs are linked to both the Session and the Library item

### Keyboard Handling
Two focus modes: `search` and `list`. Shortcuts only trigger when in `list` mode to prevent typing conflicts.

```typescript
// In useKeyboard handler:
if (focusArea === "search") return; // Don't trigger shortcuts when typing
```

### Search
- Uses Fuse.js for fuzzy matching on name, artist, tags, type
- `onInput` (not `onChange`) for live filtering as you type
- Shows all items when search is empty

## Known Issues & Limitations

### tmux Compatibility
OpenTUI crashes with SIGBUS inside tmux. Workaround: run outside tmux.
- GitHub issue: https://github.com/anomalyco/opentui/issues/490
- Tried `useThread: false` but didn't help

### Hardcoded Planned Time
Currently all selected items default to 5 minutes. Future improvement: allow setting per-item time.

### No Pagination in UI
Shows max 20 items in the list. Works fine for typical library sizes but could add scrolling.

## Environment Setup

1. Create Notion integration at https://www.notion.com/my-integrations
2. Connect integration to the Guitar Songbook page (parent of all databases)
3. Copy API key to `.env` file:
   ```
   NOTION_API_KEY=ntn_...
   ```

## Future Ideas

- [ ] Configurable planned time per item (currently hardcoded to 5 min)
- [ ] Show item details (last practiced, times practiced)
- [ ] Filter by frequency (Daily/Weekly/Monthly)
- [ ] Filter by type (Song/Exercise/Course Lesson)
- [ ] Scrollable list for large libraries
- [ ] Session templates with preset items
- [ ] Quick-add from recent items

## Session Log

### 2026-01-12: Initial Development
- Set up project with Bun and OpenTUI
- Implemented Notion API integration (fixed v5 API changes)
- Built browse/search/select UI
- Fixed keyboard shortcuts conflicting with search input
- Fixed live search (onInput vs onChange)
- Discovered and documented data source ID vs database ID distinction
- Added template support for Practice sessions
- Created GitHub repo at https://github.com/sohara/guitar-tui
