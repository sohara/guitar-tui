import React from "react";
import type { SelectedItem } from "../notion/types";
import type { FocusArea, KeyEvent, KeyHandler } from "../types";

// Keyboard hints
export const SELECTED_HINTS = "[j/k] Nav [+/-] Time [t] Edit [x] Remove [J/K] Move [o] Open [p] Practice";
export const TIME_EDIT_HINTS = "[0-9] Digits [Enter] OK [Esc] Cancel";

// Selected pane keyboard handler params
interface SelectedKeyParams {
  cursorIndex: number;
  setCursorIndex: React.Dispatch<React.SetStateAction<number>>;
  selectedItems: SelectedItem[];
  adjustTime: (index: number, delta: number) => void;
  removeItem: (index: number) => void;
  moveItem: (index: number, direction: "up" | "down") => void;
  startTimeEdit: () => void;
  openInNotion: (pageId: string) => void;
  startPractice: (index: number) => void;
  // Time edit mode
  isEditingTime: boolean;
  confirmTimeEdit: () => void;
  cancelTimeEdit: () => void;
  backspaceTimeDigit: () => void;
  appendTimeDigit: (digit: string) => void;
}

export function createSelectedKeyHandler(params: SelectedKeyParams): KeyHandler {
  const {
    cursorIndex,
    setCursorIndex,
    selectedItems,
    adjustTime,
    removeItem,
    moveItem,
    startTimeEdit,
    openInNotion,
    startPractice,
    isEditingTime,
    confirmTimeEdit,
    cancelTimeEdit,
    backspaceTimeDigit,
    appendTimeDigit,
  } = params;

  return (key: KeyEvent): boolean => {
    // Time edit mode
    if (isEditingTime) {
      if (key.name === "return") {
        confirmTimeEdit();
        return true;
      }
      if (key.name === "escape") {
        cancelTimeEdit();
        return true;
      }
      if (key.name === "backspace") {
        backspaceTimeDigit();
        return true;
      }
      // Handle digit keys
      if (key.name && /^[0-9]$/.test(key.name)) {
        appendTimeDigit(key.name);
        return true;
      }
      return true; // Consume all keys in time edit mode
    }

    // Shift+j/k to reorder items
    if (key.shift && (key.name === "k" || key.name === "K")) {
      moveItem(cursorIndex, "up");
      return true;
    }
    if (key.shift && (key.name === "j" || key.name === "J")) {
      moveItem(cursorIndex, "down");
      return true;
    }

    switch (key.name) {
      case "up":
      case "k":
        setCursorIndex((i) => Math.max(0, i - 1));
        return true;
      case "down":
      case "j":
        setCursorIndex((i) => Math.min(selectedItems.length - 1, i + 1));
        return true;
      case "=":
      case "+":
      case "]":
        adjustTime(cursorIndex, 1);
        return true;
      case "-":
      case "[":
        adjustTime(cursorIndex, -1);
        return true;
      case "x":
      case "d":
        removeItem(cursorIndex);
        return true;
      case "t":
        startTimeEdit();
        return true;
      case "o":
        if (selectedItems[cursorIndex]) {
          openInNotion(selectedItems[cursorIndex].item.id);
        }
        return true;
      case "p":
        // Only allow practice if item has been saved (has logId)
        if (selectedItems[cursorIndex]?.logId) {
          startPractice(cursorIndex);
        }
        return true;
    }
    return false;
  };
}

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
