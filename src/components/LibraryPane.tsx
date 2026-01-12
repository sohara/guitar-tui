import React from "react";
import type { PracticeLibraryItem, SelectedItem } from "../notion/types";
import type { FocusArea } from "../types";

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

          return (
            <box key={item.id}>
              <text
                bg={isCursor ? "#333333" : undefined}
                fg={isSelected ? "#69db7c" : "#ffffff"}
              >
                {isSelected ? "[x] " : "[ ] "}
                {item.name}
                {item.type && <span fg="#888888"> ({item.type})</span>}
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
