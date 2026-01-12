import React from "react";
import type { SelectedItem } from "../notion/types";
import type { FocusArea } from "../types";

interface SelectedPaneProps {
  items: SelectedItem[];
  totalMinutes: number;
  cursorIndex: number;
  focusArea: FocusArea;
  isEditing: boolean;
}

export function SelectedPane({
  items,
  totalMinutes,
  cursorIndex,
  focusArea,
  isEditing,
}: SelectedPaneProps) {
  const isFocused = focusArea === "selected";

  return (
    <box
      flexDirection="column"
      width="35%"
      borderStyle="rounded"
      borderColor={isFocused ? "#74c0fc" : "#ffa94d"}
      padding={1}
      marginLeft={1}
    >
      <text fg="#ffa94d">
        <b>{isEditing ? "Edit" : "New"}</b>
        <span fg="#888888">
          {" "}
          ({items.length}) {totalMinutes}m
        </span>
      </text>

      <box flexDirection="column" marginTop={1}>
        {items.map((sel, idx) => {
          const isCursor = idx === cursorIndex && isFocused;

          return (
            <box key={sel.item.id}>
              <text bg={isCursor ? "#333333" : undefined} fg="#69db7c">
                {isCursor ? "▶ " : "  "}
                {sel.item.name}
                <span fg="#888888"> {sel.plannedMinutes}m</span>
              </text>
            </box>
          );
        })}
      </box>

      {items.length > 0 && (
        <box marginTop={2}>
          <text bg="#69db7c" fg="#000000">
            <b> [s] {isEditing ? "Save" : "Create"} </b>
          </text>
        </box>
      )}
    </box>
  );
}
