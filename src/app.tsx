import React, { useState, useMemo } from "react";
import { useKeyboard } from "@opentui/react";
import { useNotionData, useSessionEditor } from "./hooks";
import {
  LibraryPane,
  SessionPicker,
  SelectedPane,
  PracticeMode,
  createLibraryKeyHandler,
  createSearchKeyHandler,
  createSessionPickerKeyHandler,
  createSelectedKeyHandler,
  createPracticeKeyHandler,
  LIBRARY_HINTS,
  SEARCH_HINTS,
  SESSION_PICKER_HINTS,
  SELECTED_HINTS,
  TIME_EDIT_HINTS,
} from "./components";
import { updatePracticeLog } from "./notion/client";
import type { FocusArea, PracticeState, KeyEvent } from "./types";

// Global keyboard hints (always shown)
const GLOBAL_HINTS = "[Tab] Panes [e] Sessions [s] Save [r] Refresh";

// Open a Notion page in the Notion Mac app
function openInNotion(pageId: string) {
  // Remove dashes from UUID for Notion URL format
  const cleanId = pageId.replace(/-/g, "");
  Bun.spawn(["open", `notion://notion.so/${cleanId}`]);
}

export function App() {
  const [focusArea, setFocusArea] = useState<FocusArea>("list");
  const [cursorIndex, setCursorIndex] = useState(0);
  const [practiceState, setPracticeState] = useState<PracticeState | null>(null);

  // Data fetching and search
  const data = useNotionData();
  const {
    state,
    error,
    library,
    sessions,
    searchQuery,
    setSearchQuery,
    filteredItems,
    sortField,
    sortAsc,
    typeFilter,
    cycleSortField,
    cycleTypeFilter,
    refresh,
    setSessions,
    setState,
    setError,
  } = data;

  // Session editing
  const editor = useSessionEditor(sessions);
  const {
    selectedItems,
    activeSessionId,
    activeSession,
    statusMessage,
    setStatusMessage,
    totalMinutes,
    selectedPanelIndex,
    setSelectedPanelIndex,
    sessionCursorIndex,
    setSessionCursorIndex,
    isEditingTime,
    timeInputValue,
    startTimeEdit,
    appendTimeDigit,
    backspaceTimeDigit,
    confirmTimeEdit,
    cancelTimeEdit,
    toggleItem,
    adjustTime,
    removeItem,
    moveItem,
    saveSession,
    loadSessionLogs,
    selectSession,
    clearSession,
  } = editor;

  // Practice mode helpers
  const startPractice = (itemIndex: number) => {
    const item = selectedItems[itemIndex];
    // Resume from existing actual time if any (convert minutes to ms)
    const existingMs = item?.actualMinutes ? item.actualMinutes * 60 * 1000 : 0;
    setPracticeState({
      itemIndex,
      startTime: Date.now(),
      accumulatedMs: existingMs,
      isPaused: false,
      isConfirming: false,
    });
    setState("practicing");
  };

  const togglePausePractice = () => {
    if (!practiceState) return;
    if (practiceState.isPaused) {
      // Resume: set new start time
      setPracticeState({
        ...practiceState,
        startTime: Date.now(),
        isPaused: false,
      });
    } else {
      // Pause: accumulate elapsed time
      const elapsed = Date.now() - practiceState.startTime;
      setPracticeState({
        ...practiceState,
        accumulatedMs: practiceState.accumulatedMs + elapsed,
        isPaused: true,
      });
    }
  };

  const requestStopPractice = () => {
    if (!practiceState) return;
    // Pause first if running, then show confirmation
    if (!practiceState.isPaused) {
      const elapsed = Date.now() - practiceState.startTime;
      setPracticeState({
        ...practiceState,
        accumulatedMs: practiceState.accumulatedMs + elapsed,
        isPaused: true,
        isConfirming: true,
      });
    } else {
      setPracticeState({
        ...practiceState,
        isConfirming: true,
      });
    }
  };

  const confirmSavePractice = async () => {
    if (!practiceState) return;
    const item = selectedItems[practiceState.itemIndex];
    if (!item?.logId) {
      // Can't save if no log ID (item not yet saved to Notion)
      cancelPractice();
      return;
    }

    // Store as decimal minutes for second-level precision
    const actualMinutes = practiceState.accumulatedMs / 60000;
    const displayMinutes = Math.floor(actualMinutes);
    const displaySeconds = Math.floor((practiceState.accumulatedMs % 60000) / 1000);
    setState("saving");
    try {
      await updatePracticeLog(item.logId, { actualTime: actualMinutes });
      // Reload session logs to reflect the change
      if (activeSessionId) {
        await loadSessionLogs(activeSessionId, library);
      }
      setState("browse");
      setStatusMessage(`Saved ${displayMinutes}:${displaySeconds.toString().padStart(2, "0")}!`);
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (err: any) {
      setError(`Failed to save: ${err.message}`);
      setState("error");
    }
    setPracticeState(null);
  };

  const cancelConfirmPractice = () => {
    if (!practiceState) return;
    setPracticeState({
      ...practiceState,
      isConfirming: false,
    });
  };

  const cancelPractice = () => {
    setPracticeState(null);
    setState("browse");
  };

  // Create keyboard handlers for each pane
  const libraryHandler = useMemo(() => createLibraryKeyHandler({
    cursorIndex,
    setCursorIndex,
    filteredItems,
    toggleItem,
    setFocusArea,
    cycleSortField,
    cycleTypeFilter,
    openInNotion,
  }), [cursorIndex, filteredItems, toggleItem, cycleSortField, cycleTypeFilter]);

  const searchHandler = useMemo(() => createSearchKeyHandler({
    setSearchQuery,
  }), [setSearchQuery]);

  // Close session picker and return to list
  const closeSessionPicker = () => setFocusArea("list");

  const sessionPickerHandler = useMemo(() => createSessionPickerKeyHandler({
    cursorIndex: sessionCursorIndex,
    setCursorIndex: setSessionCursorIndex,
    sessions,
    clearSession,
    selectSession,
    loadSessionLogs,
    library,
    onClose: closeSessionPicker,
  }), [sessionCursorIndex, sessions, clearSession, selectSession, loadSessionLogs, library]);

  const selectedHandler = useMemo(() => createSelectedKeyHandler({
    cursorIndex: selectedPanelIndex,
    setCursorIndex: setSelectedPanelIndex,
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
  }), [selectedPanelIndex, selectedItems, adjustTime, removeItem, moveItem, startTimeEdit, startPractice, isEditingTime, confirmTimeEdit, cancelTimeEdit, backspaceTimeDigit, appendTimeDigit]);

  // Keyboard navigation
  useKeyboard((key: KeyEvent) => {
    // Practice mode - full screen takeover
    if (state === "practicing" && practiceState) {
      const practiceHandler = createPracticeKeyHandler({
        practiceState,
        togglePause: togglePausePractice,
        requestStop: requestStopPractice,
        confirmSave: confirmSavePractice,
        cancelConfirm: cancelConfirmPractice,
        cancel: cancelPractice,
      });
      practiceHandler(key);
      return;
    }

    if (state !== "browse") return;

    // Global shortcuts

    // Tab cycles through focus areas (skip sessionPicker - it's a modal)
    if (key.name === "tab" && focusArea !== "sessionPicker") {
      setFocusArea((f) => {
        if (f === "list") return selectedItems.length > 0 ? "selected" : "search";
        if (f === "selected") return "search";
        return "list";
      });
      return;
    }

    // Escape returns to list (closes session picker if open)
    if (key.name === "escape") {
      if (focusArea === "sessionPicker") {
        setFocusArea("list");
        return;
      }
      if (focusArea !== "search") {
        setFocusArea("list");
        return;
      }
    }

    // Open session picker with 'e' (not in search or sessionPicker)
    if (key.name === "e" && focusArea !== "search" && focusArea !== "sessionPicker") {
      setFocusArea("sessionPicker");
      return;
    }

    // Save shortcut (not in search or sessionPicker mode)
    if (key.name === "s" && focusArea !== "search" && focusArea !== "sessionPicker") {
      if (selectedItems.length > 0) {
        saveSession(sessions, setSessions, setState, setError, library);
      }
      return;
    }

    // Refresh shortcut (not in search or sessionPicker mode)
    if (key.name === "r" && focusArea !== "search" && focusArea !== "sessionPicker") {
      refresh();
      return;
    }

    // Vim-style pane navigation (Ctrl+h/l) - now just list ↔ selected
    if (key.ctrl && key.name === "h" && focusArea !== "sessionPicker") {
      setFocusArea((f) => {
        if (f === "selected") return "list";
        return f;
      });
      return;
    }
    if (key.ctrl && key.name === "l" && focusArea !== "sessionPicker") {
      setFocusArea((f) => {
        if (f === "list" || f === "search") return selectedItems.length > 0 ? "selected" : f;
        return f;
      });
      return;
    }
    if (key.ctrl && key.name === "k" && focusArea !== "sessionPicker") {
      setFocusArea("search");
      return;
    }
    if (key.ctrl && key.name === "j" && focusArea === "search") {
      setFocusArea("list");
      return;
    }

    // Delegate to focused pane handler
    const handlers: Record<FocusArea, (key: KeyEvent) => boolean> = {
      list: libraryHandler,
      search: searchHandler,
      sessionPicker: sessionPickerHandler,
      selected: selectedHandler,
    };
    handlers[focusArea]?.(key);
  });

  // Loading state
  if (state === "loading") {
    return (
      <box flexDirection="column" padding={1}>
        <text>Loading Practice Library...</text>
      </box>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <box flexDirection="column" padding={1}>
        <text fg="#ff6b6b">Error: {error}</text>
        <text fg="#888888">Press Ctrl+C to exit</text>
      </box>
    );
  }

  // Creating state
  if (state === "creating") {
    return (
      <box flexDirection="column" padding={1}>
        <text>Creating practice session...</text>
      </box>
    );
  }

  // Practicing state
  if (state === "practicing" && practiceState) {
    const practiceItem = selectedItems[practiceState.itemIndex];
    if (practiceItem) {
      return (
        <PracticeMode item={practiceItem} practiceState={practiceState} />
      );
    }
  }

  // Saving state
  if (state === "saving") {
    return (
      <box flexDirection="column" padding={1}>
        <text>Saving changes...</text>
      </box>
    );
  }

  // Main browse UI
  return (
    <box flexDirection="column" height="100%" padding={1}>
      {/* Header with session selector */}
      <box>
        <text fg="#ffd43b">
          <b>Guitar Practice</b>
        </text>
        <text fg="#888888"> │ </text>
        <text fg="#74c0fc">
          Session: {activeSession?.date ?? "New"}
        </text>
        {statusMessage && (
          <text fg="#69db7c">
            {" "}[{statusMessage}]
          </text>
        )}
      </box>

      {/* Session picker dropdown (overlay) */}
      {focusArea === "sessionPicker" && (
        <SessionPicker
          sessions={sessions}
          activeSessionId={activeSessionId}
          cursorIndex={sessionCursorIndex}
        />
      )}

      {/* Main content - two panes */}
      <box flexDirection="row" flexGrow={1} marginTop={1}>
        <LibraryPane
          items={filteredItems}
          totalCount={library.length}
          selectedItems={selectedItems}
          cursorIndex={cursorIndex}
          focusArea={focusArea}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortField={sortField}
          sortAsc={sortAsc}
          typeFilter={typeFilter}
        />

        <SelectedPane
          items={selectedItems}
          totalMinutes={totalMinutes}
          cursorIndex={selectedPanelIndex}
          focusArea={focusArea}
          isEditing={activeSessionId !== null}
          isEditingTime={isEditingTime}
          timeInputValue={timeInputValue}
        />
      </box>

      {/* Footer - contextual hints based on focused pane */}
      <box marginTop={1}>
        <text fg="#666666">
          {focusArea === "list" && LIBRARY_HINTS}
          {focusArea === "search" && SEARCH_HINTS}
          {focusArea === "sessionPicker" && SESSION_PICKER_HINTS}
          {focusArea === "selected" && (isEditingTime ? TIME_EDIT_HINTS : SELECTED_HINTS)}
          {" | "}
          {GLOBAL_HINTS}
        </text>
      </box>
    </box>
  );
}
