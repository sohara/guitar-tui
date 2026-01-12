# Guitar Practice TUI

A terminal UI for quickly building guitar practice sessions in Notion.

Instead of clicking through Notion's UI to create practice sessions, browse your practice library, select items, and create a full session with one keystroke.

## How It Works

The app connects to three related Notion databases:

- **Practice Library** — Songs, exercises, and lessons you want to practice
- **Practice Sessions** — Date-based containers for each practice session
- **Practice Logs** — Links library items to sessions with planned/actual times

## Features

- Fuzzy search across your practice library
- Vim-style navigation (j/k)
- Select multiple items for a session
- Creates session + all practice logs in one action

## Prerequisites

- [Bun](https://bun.sh) runtime
- A Notion integration with access to your databases
- macOS or Linux (note: has issues running inside tmux)

## Setup

1. Clone the repo and install dependencies:
   ```bash
   bun install
   ```

2. Copy `.env.example` to `.env` and add your Notion API key:
   ```bash
   cp .env.example .env
   ```

3. Update `src/config.ts` with your Notion database IDs

4. Run:
   ```bash
   bun start
   ```

## Keybindings

| Key | Action |
|-----|--------|
| `j` / `k` | Navigate up/down |
| `Space` | Select/deselect item |
| `/` | Focus search |
| `Tab` | Switch focus |
| `Esc` | Exit search |
| `c` | Create session |
| `r` | Refresh library |
| `Ctrl+C` | Exit |

## Tech Stack

- [OpenTUI](https://github.com/anthropics/opentui) — Terminal UI framework with React reconciler
- [Notion SDK](https://github.com/makenotion/notion-sdk-js) — Official Notion API client
- [Fuse.js](https://fusejs.io/) — Fuzzy search
