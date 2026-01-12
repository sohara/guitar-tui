import React from "react";
import type { PracticeLibraryItem, SelectedItem } from "../notion/types";
import type { FocusArea } from "../types";

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
}

export function LibraryPane({
  items,
  totalCount,
  selectedItems,
  cursorIndex,
  focusArea,
  searchQuery,
  onSearchChange,
}: LibraryPaneProps) {
  const isFocused = focusArea === "list" || focusArea === "search";
  const displayItems = items.slice(0, 20);

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
        <span fg="#888888"> ({totalCount})</span>
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
        {displayItems.map((item, idx) => {
          const isSelected = selectedItems.some((s) => s.item.id === item.id);
          const isCursor = idx === cursorIndex && focusArea === "list";
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
                {(lastPracticed || timesPracticed > 0) && (
                  <span fg="#666666">
                    {lastPracticed && ` 📅 ${lastPracticed}`}
                    {lastPracticed && timesPracticed > 0 && <span fg="#444444"> | </span>}
                    {timesPracticed > 0 && <span fg="#666666">🔄 {timesPracticed}</span>}
                  </span>
                )}
              </text>
            </box>
          );
        })}
        {totalCount > 20 && (
          <text fg="#666666">... +{totalCount - 20} more</text>
        )}
      </box>
    </box>
  );
}
