import React from "react";
import type { PracticeLibraryItem, SelectedItem, ItemType } from "../notion/types";
import type { FocusArea, SortField, KeyEvent, KeyHandler } from "../types";

// Keyboard hints
export const LIBRARY_HINTS = "[j/k] Nav [Space] Select [/] Search [1/2/3] Sort [f] Filter [o] Open";
export const SEARCH_HINTS = "[Enter] Done [Esc] Exit [Ctrl+w] Clear";

// Library keyboard handler params
interface LibraryKeyParams {
  cursorIndex: number;
  setCursorIndex: React.Dispatch<React.SetStateAction<number>>;
  filteredItems: PracticeLibraryItem[];
  toggleItem: (item: PracticeLibraryItem) => void;
  setFocusArea: React.Dispatch<React.SetStateAction<FocusArea>>;
  cycleSortField: (field: SortField) => void;
  cycleTypeFilter: () => void;
  openInNotion: (pageId: string) => void;
}

export function createLibraryKeyHandler(params: LibraryKeyParams): KeyHandler {
  const {
    cursorIndex,
    setCursorIndex,
    filteredItems,
    toggleItem,
    setFocusArea,
    cycleSortField,
    cycleTypeFilter,
    openInNotion,
  } = params;

  return (key: KeyEvent): boolean => {
    // Page up/down with Ctrl+f/b
    if (key.ctrl && key.name === "f") {
      setCursorIndex((i) => Math.min(filteredItems.length - 1, i + 12));
      return true;
    }
    if (key.ctrl && key.name === "b") {
      setCursorIndex((i) => Math.max(0, i - 12));
      return true;
    }

    switch (key.name) {
      case "up":
      case "k":
        setCursorIndex((i) => Math.max(0, i - 1));
        return true;
      case "down":
      case "j":
        setCursorIndex((i) => Math.min(filteredItems.length - 1, i + 1));
        return true;
      case "space":
      case "return":
        if (filteredItems[cursorIndex]) {
          toggleItem(filteredItems[cursorIndex]);
        }
        return true;
      case "/":
        setFocusArea("search");
        return true;
      case "o":
        if (filteredItems[cursorIndex]) {
          openInNotion(filteredItems[cursorIndex].id);
        }
        return true;
      // Sort keys
      case "1":
        cycleSortField("name");
        setCursorIndex(0);
        return true;
      case "2":
        cycleSortField("lastPracticed");
        setCursorIndex(0);
        return true;
      case "3":
        cycleSortField("timesPracticed");
        setCursorIndex(0);
        return true;
      // Type filter
      case "f":
        cycleTypeFilter();
        setCursorIndex(0);
        return true;
    }
    return false;
  };
}

// Search input keyboard handler params
interface SearchKeyParams {
  setSearchQuery: (query: string) => void;
}

export function createSearchKeyHandler(params: SearchKeyParams): KeyHandler {
  const { setSearchQuery } = params;

  return (key: KeyEvent): boolean => {
    // Ctrl+w clears search
    if (key.ctrl && key.name === "w") {
      setSearchQuery("");
      return true;
    }
    return false;
  };
}

// Format a date as relative time (e.g., "3d", "2w", "3mo")
function formatRelativeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null; // Future date
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
  return `${Math.floor(diffDays / 365)}y`;
}

interface LibraryPaneProps {
  items: PracticeLibraryItem[];
  totalCount: number;
  selectedItems: SelectedItem[];
  cursorIndex: number;
  focusArea: FocusArea;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortField: SortField;
  sortAsc: boolean;
  typeFilter: ItemType | null;
}

// Sort option component
function SortOption({
  label,
  keyNum,
  isActive,
  sortAsc
}: {
  label: string;
  keyNum: number;
  isActive: boolean;
  sortAsc: boolean;
}) {
  const arrow = isActive ? (sortAsc ? "↑" : "↓") : "";
  return (
    <span fg={isActive ? "#74c0fc" : "#666666"}>
      [{keyNum}]{label}{arrow}
    </span>
  );
}

const VISIBLE_COUNT = 15;
const SCROLL_PADDING = 3;

export function LibraryPane({
  items,
  totalCount,
  selectedItems,
  cursorIndex,
  focusArea,
  searchQuery,
  onSearchChange,
  sortField,
  sortAsc,
  typeFilter,
}: LibraryPaneProps) {
  const isFocused = focusArea === "list" || focusArea === "search";

  // Calculate scroll window to keep cursor visible
  let windowStart = 0;
  if (cursorIndex > VISIBLE_COUNT - SCROLL_PADDING - 1) {
    windowStart = Math.min(
      cursorIndex - (VISIBLE_COUNT - SCROLL_PADDING - 1),
      Math.max(0, items.length - VISIBLE_COUNT)
    );
  }
  const windowEnd = Math.min(windowStart + VISIBLE_COUNT, items.length);
  const displayItems = items.slice(windowStart, windowEnd);
  const itemsAbove = windowStart;
  const itemsBelow = items.length - windowEnd;

  return (
    <box
      flexDirection="column"
      width="45%"
      borderStyle="rounded"
      borderColor={isFocused ? "#74c0fc" : "#444444"}
      padding={1}
    >
      <text fg="#74c0fc">
        <b>Library</b>
        <span fg="#888888">
          {" "}({items.length}{typeFilter ? `/${totalCount}` : ""})
          {typeFilter && <span fg="#ffa94d"> {typeFilter}s</span>}
        </span>
      </text>
      {/* Sort options */}
      <box>
        <SortOption label="Name" keyNum={1} isActive={sortField === "name"} sortAsc={sortAsc} />
        <text fg="#444444"> </text>
        <SortOption label="Last Practiced" keyNum={2} isActive={sortField === "lastPracticed"} sortAsc={sortAsc} />
        <text fg="#444444"> </text>
        <SortOption label="Times Practiced" keyNum={3} isActive={sortField === "timesPracticed"} sortAsc={sortAsc} />
      </box>

      {/* Search input */}
      <box marginTop={1}>
        <text fg="#888888">/</text>
        <input
          value={searchQuery}
          onInput={onSearchChange}
          placeholder="search..."
          focused={focusArea === "search"}
          width={30}
        />
      </box>

      {/* Item list */}
      <box flexDirection="column" marginTop={1}>
        {itemsAbove > 0 && (
          <text fg="#666666">↑ {itemsAbove} more</text>
        )}
        {displayItems.map((item, idx) => {
          const actualIndex = windowStart + idx;
          const isSelected = selectedItems.some((s) => s.item.id === item.id);
          const isCursor = actualIndex === cursorIndex && focusArea === "list";
          const lastPracticed = formatRelativeDate(item.lastPracticed);
          const timesPracticed = item.timesPracticed;

          return (
            <box key={item.id}>
              <text
                bg={isCursor ? "#333333" : undefined}
                fg={isSelected ? "#69db7c" : "#ffffff"}
              >
                {isSelected ? "[x] " : "[ ] "}
                {item.name}
                {item.type && <span fg="#888888"> ({item.type})</span>}
                {(lastPracticed || (timesPracticed ?? 0) > 0) && (
                  <span fg="#666666">
                    {lastPracticed && ` 📅 ${lastPracticed}`}
                    {lastPracticed && (timesPracticed ?? 0) > 0 && <span fg="#444444"> | </span>}
                    {(timesPracticed ?? 0) > 0 && <span fg="#666666">🔄 {timesPracticed}</span>}
                  </span>
                )}
              </text>
            </box>
          );
        })}
        {itemsBelow > 0 && (
          <text fg="#666666">↓ {itemsBelow} more</text>
        )}
      </box>
    </box>
  );
}
