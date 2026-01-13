import React from "react";
import type { PracticeLibraryItem, SelectedItem, ItemType } from "../notion/types";
import type { FocusArea, SortField } from "../types";

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

// Format sort field for display
function formatSortField(field: SortField): string {
  switch (field) {
    case "name": return "Name";
    case "lastPracticed": return "Last";
    case "timesPracticed": return "Times";
  }
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
          {" "}{sortAsc ? "↑" : "↓"}{formatSortField(sortField)}
        </span>
      </text>

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
