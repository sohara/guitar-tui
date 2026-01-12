# Guitar Practice TUI

A terminal UI for creating guitar practice sessions in Notion.

## Quick Start

```bash
bun install
bun start
```

## Documentation

Read `docs/DEVELOPMENT.md` for:
- Notion database structure and IDs
- API v5 quirks (data source ID vs database ID)
- Implementation details and architecture decisions
- Known issues and requirements
- Future improvement ideas

## Key Files

- `src/app.tsx` - Main UI component
- `src/notion/client.ts` - Notion API functions
- `src/config.ts` - Database/template IDs

## Notes

- Requires Bun 1.3+ (older versions cause SIGBUS crashes)
- tmux compatibility untested with newer Bun
