import React, { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { useNotionData, useSessionEditor } from "./hooks";
import { LibraryPane, SessionsPane, SelectedPane } from "./components";
import type { FocusArea } from "./types";

export function App() {
  const [focusArea, setFocusArea] = useState<FocusArea>("list");
  const [cursorIndex, setCursorIndex] = useState(0);

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

  // Keyboard navigation
  useKeyboard((key) => {
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

    // Search input mode - only allow escape
    if (focusArea === "search") return;

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
      }
      return;
    }

    // Library list navigation
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
          totalCount={filteredItems.length}
          selectedItems={selectedItems}
          cursorIndex={cursorIndex}
          focusArea={focusArea}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
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
          [j/k] Nav [Space] Select [^h/l] Pane [/] Search [+/-/t] Time [J/K] Reorder [x] Remove [s] Save [r] Refresh
        </text>
      </box>
    </box>
  );
}
