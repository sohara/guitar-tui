// UI state types

export type AppState = "loading" | "browse" | "creating" | "saving" | "error" | "practicing";
export type FocusArea = "search" | "list" | "sessions" | "selected";

// Practice mode state
export interface PracticeState {
  itemIndex: number;      // Index in selectedItems
  startTime: number;      // Date.now() when started/resumed
  accumulatedMs: number;  // Time accumulated before current run
  isPaused: boolean;
  isConfirming: boolean;  // Showing "Save? [y/n]" prompt
}
