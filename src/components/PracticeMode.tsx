import React, { useState, useEffect } from "react";
import type { SelectedItem } from "../notion/types";
import type { PracticeState, KeyEvent, KeyHandler } from "../types";

// Practice mode keyboard handler params
interface PracticeKeyParams {
  practiceState: PracticeState;
  togglePause: () => void;
  requestStop: () => void;
  confirmSave: () => void;
  cancelConfirm: () => void;
  cancel: () => void;
}

export function createPracticeKeyHandler(params: PracticeKeyParams): KeyHandler {
  const {
    practiceState,
    togglePause,
    requestStop,
    confirmSave,
    cancelConfirm,
    cancel,
  } = params;

  return (key: KeyEvent): boolean => {
    if (practiceState.isConfirming) {
      // Confirmation mode: y/n
      if (key.name === "y") {
        confirmSave();
        return true;
      }
      if (key.name === "n") {
        cancelConfirm();
        return true;
      }
      if (key.name === "escape") {
        cancel();
        return true;
      }
      return true; // Consume all keys in confirmation mode
    }

    // Normal practice mode
    if (key.name === "space") {
      togglePause();
      return true;
    }
    if (key.name === "return") {
      requestStop();
      return true;
    }
    if (key.name === "escape") {
      cancel();
      return true;
    }
    return true; // Consume all keys in practice mode
  };
}

interface PracticeModeProps {
  item: SelectedItem;
  practiceState: PracticeState;
}

// Big ASCII digits (5 lines tall)
const BIG_DIGITS: Record<string, string[]> = {
  "0": [
    " ███ ",
    "█   █",
    "█   █",
    "█   █",
    " ███ ",
  ],
  "1": [
    "  █  ",
    " ██  ",
    "  █  ",
    "  █  ",
    " ███ ",
  ],
  "2": [
    " ███ ",
    "█   █",
    "  ██ ",
    " █   ",
    "█████",
  ],
  "3": [
    "████ ",
    "    █",
    " ███ ",
    "    █",
    "████ ",
  ],
  "4": [
    "█   █",
    "█   █",
    "█████",
    "    █",
    "    █",
  ],
  "5": [
    "█████",
    "█    ",
    "████ ",
    "    █",
    "████ ",
  ],
  "6": [
    " ███ ",
    "█    ",
    "████ ",
    "█   █",
    " ███ ",
  ],
  "7": [
    "█████",
    "    █",
    "   █ ",
    "  █  ",
    "  █  ",
  ],
  "8": [
    " ███ ",
    "█   █",
    " ███ ",
    "█   █",
    " ███ ",
  ],
  "9": [
    " ███ ",
    "█   █",
    " ████",
    "    █",
    " ███ ",
  ],
  ":": [
    "     ",
    "  █  ",
    "     ",
    "  █  ",
    "     ",
  ],
};

// Render time as big ASCII art (returns array of 5 lines)
function renderBigTime(ms: number): string[] {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const lines: string[] = ["", "", "", "", ""];
  for (const char of timeStr) {
    const digit = BIG_DIGITS[char] || BIG_DIGITS["0"];
    for (let i = 0; i < 5; i++) {
      lines[i] += digit[i] + " ";
    }
  }
  return lines;
}

// Format milliseconds as MM:SS or HH:MM:SS (for confirmation display)
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PracticeMode({ item, practiceState }: PracticeModeProps) {
  const [displayMs, setDisplayMs] = useState(0);

  // Update display time every 100ms
  useEffect(() => {
    const updateDisplay = () => {
      if (practiceState.isPaused) {
        setDisplayMs(practiceState.accumulatedMs);
      } else {
        const elapsed = Date.now() - practiceState.startTime;
        setDisplayMs(practiceState.accumulatedMs + elapsed);
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 100);
    return () => clearInterval(interval);
  }, [practiceState.startTime, practiceState.accumulatedMs, practiceState.isPaused]);

  const displayMinutes = Math.round(displayMs / 60000);

  return (
    <box flexDirection="column" height="100%" padding={2}>
      {/* Spacer */}
      <box flexGrow={1} />

      {/* Main content centered */}
      <box flexDirection="column" alignItems="center">
        <text fg="#ffd43b">Practicing</text>

        <box marginTop={2}>
          <text fg="#ffffff">
            <b>{item.item.name}</b>
          </text>
        </box>

        {item.item.type && (
          <text fg="#888888">({item.item.type})</text>
        )}

        {/* Big ASCII Timer */}
        <box marginTop={2} flexDirection="column" alignItems="center">
          {renderBigTime(displayMs).map((line, i) => (
            <text key={i} fg={practiceState.isPaused ? "#ffa94d" : "#69db7c"}>
              {line}
            </text>
          ))}
        </box>

        {/* Status and planned time */}
        <box marginTop={1}>
          <text fg={practiceState.isPaused ? "#ffa94d" : "#69db7c"}>
            {practiceState.isPaused ? "⏸  Paused" : "▶  Running"}
          </text>
          <text fg="#666666">  |  </text>
          <text fg="#888888">
            Planned: {item.plannedMinutes}m
          </text>
        </box>

        {/* Confirmation prompt */}
        {practiceState.isConfirming ? (
          <box marginTop={3} flexDirection="column" alignItems="center">
            <text fg="#ffd43b">
              Save {displayMinutes}m to "{item.item.name}"?
            </text>
            <box marginTop={1}>
              <text fg="#69db7c">[y] Yes</text>
              <text fg="#888888">  </text>
              <text fg="#ff6b6b">[n] No</text>
            </box>
          </box>
        ) : (
          <box marginTop={3}>
            <text fg="#666666">
              [Space] {practiceState.isPaused ? "Resume" : "Pause"}   [Enter] Done   [Esc] Cancel
            </text>
          </box>
        )}
      </box>

      {/* Spacer */}
      <box flexGrow={1} />
    </box>
  );
}
