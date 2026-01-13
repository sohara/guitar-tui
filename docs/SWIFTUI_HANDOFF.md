# SwiftUI Native App Handoff

This document provides context for building a native macOS SwiftUI app with feature parity to the existing TUI app.

## Project Context

The Guitar Practice TUI (`guitar-tui/`) is a terminal app for managing guitar practice sessions in Notion. It works well but has limitations inherent to terminal UIs. The goal is to build a native Mac app that provides the same functionality with a better UX and additional features like a menu bar timer.

## Reference Documents

- `docs/NATIVE_MAC_APP.md` - Architecture sketch for SwiftUI port
- `docs/DEVELOPMENT.md` - Full development history and Notion API details

## Notion Integration

The app integrates with three Notion databases:

| Database | Purpose | Data Source ID |
|----------|---------|----------------|
| Practice Library | Master list of songs/exercises | `2d709433-8b1b-804c-897c-000b76c9e481` |
| Practice Sessions | Date-based session containers | `f4658dc0-2eb2-43fe-b268-1bba231c0156` |
| Practice Logs | Junction: items ↔ sessions with time tracking | `2d709433-8b1b-809b-bae2-000b1343e18f` |

**Important**: Notion SDK v5 uses "data source IDs" for queries and "database IDs" for page creation. See `docs/DEVELOPMENT.md` for details.

## Features Requiring Parity

### Core Workflow
- [ ] Browse Practice Library (songs, exercises, course lessons)
- [ ] Search/filter library with fuzzy matching
- [ ] Filter by type (Song/Exercise/Course Lesson)
- [ ] Sort by name, last practiced, or times practiced (reversible)
- [ ] Select items to add to a session
- [ ] Create new practice sessions
- [ ] Edit existing sessions (add/remove items, adjust times)
- [ ] Delta save (only sync changed items to Notion)

### Session Editing
- [ ] View selected items with planned time
- [ ] Adjust planned time per item (+/- or direct input)
- [ ] Remove items from session
- [ ] Reorder items in session (drag or keyboard)
- [ ] Show completion status and actual vs planned time

### Practice Timer
- [ ] Full-screen practice mode for focused practice
- [ ] Start/pause/resume timer
- [ ] Finish with confirmation
- [ ] Track actual time practiced (stored as decimal minutes)
- [ ] Resume from previous actual time if re-practicing

### Data Display
- [ ] Show last practiced date per item
- [ ] Show times practiced count per item
- [ ] Show session date and item count
- [ ] Show total planned/actual time for session

### Navigation & UX
- [ ] Keyboard-driven navigation (vim-style j/k, etc.)
- [ ] Quick search with live filtering
- [ ] Open items in Notion app (`notion://` URL scheme)
- [ ] Refresh data from Notion
- [ ] Session picker (dropdown or sidebar)

## Features to Add (Native App Advantages)

These go beyond the TUI but should come after core parity:

- [ ] Menu bar timer widget (always visible during practice)
- [ ] Native notifications (practice reminders, session complete)
- [ ] Drag and drop for reordering
- [ ] Richer item details (expandable rows, metadata)
- [ ] Offline support with sync queue
- [ ] "What should I practice?" recommendations

## Technical Notes

### Notion API in Swift
- Use URLSession with async/await
- API base: `https://api.notion.com/v1/`
- Auth: Bearer token in header
- See `src/notion/client.ts` for API patterns to replicate

### Key Data Types
```swift
struct LibraryItem {
    let id: String
    let name: String
    let type: ItemType // Song, Exercise, CourseLesson
    let artist: String?
    let tags: [String]
    let lastPracticed: Date?
    let timesPracticed: Int
}

struct PracticeSession {
    let id: String
    let name: String
    let date: Date
    let logIds: [String]
}

struct PracticeLog {
    let id: String
    let itemId: String
    let sessionId: String
    let plannedMinutes: Int
    let actualMinutes: Double?
    let order: Int
}

struct SelectedItem {
    let item: LibraryItem
    var plannedMinutes: Int
    var actualMinutes: Double?
    var logId: String? // nil if not yet saved
}
```

### Suggested Build Order
1. Project setup with SwiftUI app lifecycle
2. Main window with split view (Library | Session)
3. Notion API client (fetch library, sessions)
4. Library list with search and filtering
5. Session editing (select items, adjust times)
6. Save/sync to Notion
7. Practice timer (full window mode)
8. Menu bar integration (last)

## Getting Started

1. Create new Xcode project: macOS → App → SwiftUI
2. Project location: `~/Code/spikes/guitar-practice-mac/`
3. Copy Notion API key from `guitar-tui/.env`
4. Start with Notion client and data fetching
5. Reference TUI code in `guitar-tui/src/` for logic patterns

## TUI Keyboard Reference

For designing keyboard shortcuts in native app:

| Action | TUI Key | Native Equivalent |
|--------|---------|-------------------|
| Navigate list | j/k | ↑/↓ arrows (or j/k) |
| Select item | Space | Space or Enter |
| Search | / or typing | ⌘F or typing |
| Save session | s | ⌘S |
| Refresh | r | ⌘R |
| Open in Notion | o | ⌘O or double-click |
| Adjust time | +/- | +/- or stepper |
| Remove item | x | Delete or ⌘⌫ |
| Start practice | p | Enter or button |
