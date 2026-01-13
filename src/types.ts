// UI state types

export type AppState = "loading" | "browse" | "creating" | "saving" | "error" | "practicing";
export type FocusArea = "search" | "list" | "sessionPicker" | "selected";

// Keyboard handling types
export interface KeyEvent {
  name: string;
  ctrl?: boolean;
  shift?: boolean;
}

export type KeyHandler = (key: KeyEvent) => boolean; // true if handled

// Sort/filter types
export type SortField = "name" | "lastPracticed" | "timesPracticed";

// Practice mode state
export interface PracticeState {
  itemIndex: number;      // Index in selectedItems
  startTime: number;      // Date.now() when started/resumed
  accumulatedMs: number;  // Time accumulated before current run
  isPaused: boolean;
  isConfirming: boolean;  // Showing "Save? [y/n]" prompt
}
