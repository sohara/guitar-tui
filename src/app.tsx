import React, { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { useNotionData, useSessionEditor } from "./hooks";
import { LibraryPane, SessionsPane, SelectedPane, PracticeMode } from "./components";
import { updatePracticeLog } from "./notion/client";
import type { FocusArea, PracticeState } from "./types";

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

  // Keyboard navigation
  useKeyboard((key) => {
    // Practice mode keyboard handling
    if (state === "practicing" && practiceState) {
      if (practiceState.isConfirming) {
        // Confirmation mode: y/n
        if (key.name === "y") {
          confirmSavePractice();
          return;
        }
        if (key.name === "n") {
          cancelConfirmPractice();
          return;
        }
        if (key.name === "escape") {
          cancelPractice();
          return;
        }
        return; // Ignore other keys in confirmation
      }

      // Normal practice mode
      if (key.name === "space") {
        togglePausePractice();
        return;
      }
      if (key.name === "return") {
        requestStopPractice();
        return;
      }
      if (key.name === "escape") {
        cancelPractice();
        return;
      }
      return; // Ignore other keys in practice mode
    }

    if (state !== "browse") return;

    // Tab cycles through focus areas
    if (key.name === "tab") {
      setFocusArea((f) => {
        if (f === "list") return "sessions";
        if (f === "sessions") return selectedItems.length > 0 ? "selected" : "search";
        if (f === "selected") return "search";
        return "list";
      });
      return;
    }

    // Escape returns to list
    if (key.name === "escape") {
      setFocusArea("list");
      return;
    }

    // Global save shortcut
    if (key.name === "s" && focusArea !== "search") {
      if (selectedItems.length > 0) {
        saveSession(sessions, setSessions, setState, setError, library);
      }
      return;
    }

    // Global refresh shortcut
    if (key.name === "r" && focusArea !== "search") {
      refresh();
      return;
    }

    // Vim-style pane navigation
    if (key.ctrl && key.name === "h") {
      setFocusArea((f) => {
        if (f === "selected") return "sessions";
        if (f === "sessions") return "list";
        return f;
      });
      return;
    }
    if (key.ctrl && key.name === "l") {
      setFocusArea((f) => {
        if (f === "list" || f === "search") return "sessions";
        if (f === "sessions") return selectedItems.length > 0 ? "selected" : f;
        return f;
      });
      return;
    }
    if (key.ctrl && key.name === "k") {
      setFocusArea("search");
      return;
    }
    if (key.ctrl && key.name === "j") {
      if (focusArea === "search") {
        setFocusArea("list");
        return;
      }
    }

    // Search input mode
    if (focusArea === "search") {
      // Ctrl+w clears search
      if (key.ctrl && key.name === "w") {
        setSearchQuery("");
        return;
      }
      return;
    }

    // Sessions panel navigation
    if (focusArea === "sessions") {
      switch (key.name) {
        case "up":
        case "k":
          setSessionCursorIndex((i) => Math.max(0, i - 1));
          break;
        case "down":
        case "j":
          setSessionCursorIndex((i) => Math.min(sessions.length, i + 1));
          break;
        case "space":
        case "return":
          if (sessionCursorIndex === 0) {
            clearSession();
          } else {
            const session = sessions[sessionCursorIndex - 1];
            if (session) {
              selectSession(session.id, sessions);
              loadSessionLogs(session.id, library);
            }
          }
          break;
      }
      return;
    }

    // Selected panel navigation
    if (focusArea === "selected") {
      // Time edit mode
      if (isEditingTime) {
        if (key.name === "return") {
          confirmTimeEdit();
          return;
        }
        if (key.name === "escape") {
          cancelTimeEdit();
          return;
        }
        if (key.name === "backspace") {
          backspaceTimeDigit();
          return;
        }
        // Handle digit keys
        if (key.name && /^[0-9]$/.test(key.name)) {
          appendTimeDigit(key.name);
          return;
        }
        return; // Ignore other keys in time edit mode
      }

      // Shift+j/k to reorder items
      if (key.shift && (key.name === "k" || key.name === "K")) {
        moveItem(selectedPanelIndex, "up");
        return;
      }
      if (key.shift && (key.name === "j" || key.name === "J")) {
        moveItem(selectedPanelIndex, "down");
        return;
      }

      switch (key.name) {
        case "up":
        case "k":
          setSelectedPanelIndex((i) => Math.max(0, i - 1));
          break;
        case "down":
        case "j":
          setSelectedPanelIndex((i) => Math.min(selectedItems.length - 1, i + 1));
          break;
        case "=":
        case "+":
        case "]":
          adjustTime(selectedPanelIndex, 1);
          break;
        case "-":
        case "[":
          adjustTime(selectedPanelIndex, -1);
          break;
        case "x":
        case "d":
          removeItem(selectedPanelIndex);
          break;
        case "t":
          startTimeEdit();
          break;
        case "o":
          if (selectedItems[selectedPanelIndex]) {
            openInNotion(selectedItems[selectedPanelIndex].item.id);
          }
          break;
        case "p":
          // Only allow practice if item has been saved (has logId)
          if (selectedItems[selectedPanelIndex]?.logId) {
            startPractice(selectedPanelIndex);
          }
          break;
      }
      return;
    }

    // Library list navigation
    // Page up/down with Ctrl+b/f
    if (key.ctrl && key.name === "f") {
      setCursorIndex((i) => Math.min(filteredItems.length - 1, i + 12));
      return;
    }
    if (key.ctrl && key.name === "b") {
      setCursorIndex((i) => Math.max(0, i - 12));
      return;
    }

    switch (key.name) {
      case "up":
      case "k":
        setCursorIndex((i) => Math.max(0, i - 1));
        break;
      case "down":
      case "j":
        setCursorIndex((i) => Math.min(filteredItems.length - 1, i + 1));
        break;
      case "space":
      case "return":
        if (filteredItems[cursorIndex]) {
          toggleItem(filteredItems[cursorIndex]);
        }
        break;
      case "/":
        setFocusArea("search");
        break;
      case "o":
        if (filteredItems[cursorIndex]) {
          openInNotion(filteredItems[cursorIndex].id);
        }
        break;
      // Sort keys
      case "1":
        cycleSortField("name");
        setCursorIndex(0);
        break;
      case "2":
        cycleSortField("lastPracticed");
        setCursorIndex(0);
        break;
      case "3":
        cycleSortField("timesPracticed");
        setCursorIndex(0);
        break;
      // Type filter
      case "f":
        cycleTypeFilter();
        setCursorIndex(0);
        break;
    }
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
      {/* Header */}
      <box>
        <text fg="#ffd43b">
          <b>Guitar Practice Session Builder</b>
        </text>
        {activeSession && (
          <text fg="#74c0fc">
            {" "}
            - Editing: {activeSession.name} ({activeSession.date})
          </text>
        )}
        {statusMessage && (
          <text fg="#69db7c">
            {" "}
            [{statusMessage}]
          </text>
        )}
      </box>

      {/* Main content */}
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

        <SessionsPane
          sessions={sessions}
          activeSessionId={activeSessionId}
          cursorIndex={sessionCursorIndex}
          focusArea={focusArea}
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

      {/* Footer */}
      <box marginTop={1}>
        <text fg="#666666">
          [j/k] Nav [Space] Select [/] Search [1/2/3] Sort [f] Filter [o] Open [p] Practice [s] Save [r] Refresh
        </text>
      </box>
    </box>
  );
}
