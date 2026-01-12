import React from "react";
import type { SelectedItem } from "../notion/types";
import type { FocusArea } from "../types";

// Format decimal minutes as M:SS
function formatActualTime(decimalMinutes: number): string {
  const totalSeconds = Math.round(decimalMinutes * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface SelectedPaneProps {
  items: SelectedItem[];
  totalMinutes: number;
  cursorIndex: number;
  focusArea: FocusArea;
  isEditing: boolean;
  isEditingTime: boolean;
  timeInputValue: string;
}

export function SelectedPane({
  items,
  totalMinutes,
  cursorIndex,
  focusArea,
  isEditing,
  isEditingTime,
  timeInputValue,
}: SelectedPaneProps) {
  const isFocused = focusArea === "selected";
  const totalActual = items.reduce((sum, i) => sum + (i.actualMinutes || 0), 0);
  const completedCount = items.filter((i) => i.actualMinutes !== undefined && i.actualMinutes > 0).length;

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
          ({completedCount}/{items.length})
          {" "}
          {totalActual > 0 ? (
            <span>
              <span fg="#69db7c">{formatActualTime(totalActual)}</span>
              <span fg="#666666">/</span>
              {totalMinutes}m
            </span>
          ) : (
            <span>{totalMinutes}m</span>
          )}
        </span>
      </text>

      <box flexDirection="column" marginTop={1}>
        {items.map((sel, idx) => {
          const isCursor = idx === cursorIndex && isFocused;
          const isEditingThisTime = isCursor && isEditingTime;
          const isCompleted = sel.actualMinutes !== undefined && sel.actualMinutes > 0;

          return (
            <box key={sel.item.id}>
              <text bg={isCursor ? "#333333" : undefined}>
                {/* Status indicator */}
                <span fg={isCompleted ? "#69db7c" : "#666666"}>
                  {isCursor ? "▶" : isCompleted ? "✓" : " "}
                </span>
                {" "}
                {/* Item name */}
                <span fg={isCompleted ? "#69db7c" : "#ffffff"}>
                  {sel.item.name}
                </span>
                {" "}
                {/* Time display */}
                {isEditingThisTime ? (
                  <span fg="#ffd43b" bg="#444444">
                    [{timeInputValue || "_"}]m
                  </span>
                ) : (
                  <span fg="#888888">
                    {sel.plannedMinutes}m
                    {isCompleted && sel.actualMinutes !== undefined && (
                      <span fg="#69db7c"> → {formatActualTime(sel.actualMinutes)}</span>
                    )}
                  </span>
                )}
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

      {isEditingTime && (
        <box marginTop={1}>
          <text fg="#ffd43b">Time: type digits, Enter=ok, Esc=cancel</text>
        </box>
      )}
    </box>
  );
}
