import React, { useState, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import Fuse from "fuse.js";
import {
  fetchPracticeLibrary,
  fetchPracticeSessions,
  fetchPracticeLogsBySession,
  createFullSession,
  createPracticeLog,
  updatePracticeLog,
  deletePracticeLog,
} from "./notion/client";
import type {
  PracticeLibraryItem,
  PracticeSession,
  SelectedItem,
} from "./notion/types";
import { config } from "./config";

type AppState = "loading" | "browse" | "creating" | "saving" | "error";
type FocusArea = "search" | "list" | "sessions" | "selected";

export function App() {
  const [state, setState] = useState<AppState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<PracticeLibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [originalItems, setOriginalItems] = useState<SelectedItem[]>([]); // For change detection
  const [fuse, setFuse] = useState<Fuse<PracticeLibraryItem> | null>(null);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [focusArea, setFocusArea] = useState<FocusArea>("list");

  // Session state
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionCursorIndex, setSessionCursorIndex] = useState(0); // 0 = "New Session"
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(0); // For navigating selected items
  const [statusMessage, setStatusMessage] = useState<string | null>(null); // Brief feedback messages

  // Load the practice library and sessions on mount
  useEffect(() => {
    if (!config.notion.apiKey) {
      setError("NOTION_API_KEY environment variable not set");
      setState("error");
      return;
    }

    Promise.all([fetchPracticeLibrary(), fetchPracticeSessions()])
      .then(([items, fetchedSessions]) => {
        setLibrary(items);
        setFuse(
          new Fuse(items, {
            keys: ["name", "artist", "tags", "type"],
            threshold: 0.4,
          })
        );
        setSessions(fetchedSessions);
        setState("browse");
      })
      .catch((err) => {
        setError(`Failed to load data: ${err.message}`);
        setState("error");
      });
  }, []);

  // Helper to get active session object
  const activeSession = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId)
    : null;

  // Load session logs when active session changes
  const loadSessionLogs = async (sessionId: string) => {
    const logs = await fetchPracticeLogsBySession(sessionId);
    // Convert logs to SelectedItems by looking up library items
    const items: SelectedItem[] = [];
    for (const log of logs) {
      const libraryItem = library.find((item) => item.id === log.itemId);
      if (libraryItem) {
        items.push({
          item: libraryItem,
          plannedMinutes: log.plannedTime || 5,
          logId: log.id,
        });
      }
    }
    setSelectedItems(items);
    setOriginalItems(JSON.parse(JSON.stringify(items))); // Deep copy for change detection
    setSelectedPanelIndex(0);
  };

  // Filter items based on search (show all if no query)
  const filteredItems =
    searchQuery && fuse
      ? fuse.search(searchQuery).map((r) => r.item)
      : library;

  // Keyboard navigation
  useKeyboard((key) => {
    if (state !== "browse") return;

    // Tab cycles through focus areas: list → sessions → selected → search → list
    if (key.name === "tab") {
      setFocusArea((f) => {
        if (f === "list") return "sessions";
        if (f === "sessions") return selectedItems.length > 0 ? "selected" : "search";
        if (f === "selected") return "search";
        return "list";
      });
      return;
    }

    // Escape returns to list from other areas
    if (key.name === "escape") {
      setFocusArea("list");
      return;
    }

    // Global save shortcut (works from any panel except search)
    if (key.name === "s" && focusArea !== "search") {
      if (selectedItems.length > 0) {
        handleSaveSession();
      }
      return;
    }

    // Global refresh shortcut
    if (key.name === "r" && focusArea !== "search") {
      setState("loading");
      Promise.all([fetchPracticeLibrary(), fetchPracticeSessions()])
        .then(([items, fetchedSessions]) => {
          setLibrary(items);
          setFuse(
            new Fuse(items, {
              keys: ["name", "artist", "tags", "type"],
              threshold: 0.4,
            })
          );
          setSessions(fetchedSessions);
          setState("browse");
        })
        .catch((err) => {
          setError(`Failed to refresh: ${err.message}`);
          setState("error");
        });
      return;
    }

    // Vim-style pane navigation with Ctrl+h/l
    // Layout: [Library/Search] ↔ [Sessions] ↔ [Selected]
    if (key.ctrl && key.name === "h") {
      setFocusArea((f) => {
        if (f === "selected") return "sessions";
        if (f === "sessions") return "list";
        return f; // list/search stay in library pane
      });
      return;
    }
    if (key.ctrl && key.name === "l") {
      setFocusArea((f) => {
        if (f === "list" || f === "search") return "sessions";
        if (f === "sessions") return selectedItems.length > 0 ? "selected" : f;
        return f; // already at rightmost
      });
      return;
    }
    // Ctrl+k to jump to search (vim "up" motion within library pane)
    if (key.ctrl && key.name === "k") {
      setFocusArea("search");
      return;
    }
    // Ctrl+j to jump back to list from search
    if (key.ctrl && key.name === "j") {
      if (focusArea === "search") {
        setFocusArea("list");
        return;
      }
    }

    // Search input mode - only allow escape
    if (focusArea === "search") return;

    // Handle navigation based on focus area
    if (focusArea === "sessions") {
      switch (key.name) {
        case "up":
        case "k":
          setSessionCursorIndex((i) => Math.max(0, i - 1));
          break;
        case "down":
        case "j":
          setSessionCursorIndex((i) => Math.min(sessions.length, i + 1)); // +1 for "New Session"
          break;
        case "space":
        case "return":
          if (sessionCursorIndex === 0) {
            // "New Session" selected
            setActiveSessionId(null);
            setSelectedItems([]);
            setOriginalItems([]);
          } else {
            // Select existing session
            const session = sessions[sessionCursorIndex - 1];
            if (session) {
              setActiveSessionId(session.id);
              loadSessionLogs(session.id);
            }
          }
          break;
      }
      return;
    }

    if (focusArea === "selected") {
      switch (key.name) {
        case "up":
        case "k":
          setSelectedPanelIndex((i) => Math.max(0, i - 1));
          break;
        case "down":
        case "j":
          setSelectedPanelIndex((i) => Math.min(selectedItems.length - 1, i + 1));
          break;
        case "=": // + key (shift+=)
        case "+":
        case "]":
          // Increase time
          if (selectedItems[selectedPanelIndex]) {
            const newItems = [...selectedItems];
            newItems[selectedPanelIndex] = {
              ...newItems[selectedPanelIndex],
              plannedMinutes: newItems[selectedPanelIndex].plannedMinutes + 1,
            };
            setSelectedItems(newItems);
          }
          break;
        case "-":
        case "[":
          // Decrease time (min 1)
          if (selectedItems[selectedPanelIndex]) {
            const newItems = [...selectedItems];
            newItems[selectedPanelIndex] = {
              ...newItems[selectedPanelIndex],
              plannedMinutes: Math.max(1, newItems[selectedPanelIndex].plannedMinutes - 1),
            };
            setSelectedItems(newItems);
          }
          break;
        case "x":
        case "d":
          // Remove item
          if (selectedItems[selectedPanelIndex]) {
            const newItems = selectedItems.filter((_, i) => i !== selectedPanelIndex);
            setSelectedItems(newItems);
            setSelectedPanelIndex(Math.min(selectedPanelIndex, newItems.length - 1));
          }
          break;
      }
      return;
    }

    // Library list focus
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
          const item = filteredItems[cursorIndex];
          if (selectedItems.some((s) => s.item.id === item.id)) {
            // Deselect
            setSelectedItems(selectedItems.filter((s) => s.item.id !== item.id));
          } else {
            // Select with default 5 minutes
            setSelectedItems([...selectedItems, { item, plannedMinutes: 5 }]);
          }
        }
        break;
      case "/":
        // Quick shortcut to focus search
        setFocusArea("search");
        break;
    }
  });

  const handleSaveSession = async () => {
    if (selectedItems.length === 0 && !activeSessionId) return;

    setState(activeSessionId ? "saving" : "creating");

    try {
      if (activeSessionId) {
        // EDIT MODE: Apply changes to existing session
        const originalIds = new Set(originalItems.map((i) => i.logId));
        const currentIds = new Set(selectedItems.filter((i) => i.logId).map((i) => i.logId));

        // Delete removed items
        for (const orig of originalItems) {
          if (orig.logId && !currentIds.has(orig.logId)) {
            await deletePracticeLog(orig.logId);
          }
        }

        // Update changed items and create new items
        for (const item of selectedItems) {
          if (item.logId) {
            // Existing item - check if time changed
            const original = originalItems.find((o) => o.logId === item.logId);
            if (original && original.plannedMinutes !== item.plannedMinutes) {
              await updatePracticeLog(item.logId, item.plannedMinutes);
            }
          } else {
            // New item - create log
            await createPracticeLog({
              name: item.item.name,
              itemId: item.item.id,
              sessionId: activeSessionId,
              plannedTime: item.plannedMinutes,
            });
          }
        }

        // Refresh sessions and reload current session logs
        const fetchedSessions = await fetchPracticeSessions();
        setSessions(fetchedSessions);
        // Reload logs so originalItems is updated for further edits
        await loadSessionLogs(activeSessionId);
        setState("browse");
        setStatusMessage("Saved!");
        setTimeout(() => setStatusMessage(null), 2000);
      } else {
        // CREATE MODE: Create new session
        const today = new Date().toISOString().split("T")[0];
        const sessionName = `Practice`;

        const result = await createFullSession(sessionName, today, selectedItems);

        // Refresh sessions and select the new session
        const fetchedSessions = await fetchPracticeSessions();
        setSessions(fetchedSessions);
        // Switch to the new session for continued editing
        setActiveSessionId(result.session.id);
        await loadSessionLogs(result.session.id);
        // Update session cursor to point to the new session (index 1, after "New Session")
        setSessionCursorIndex(1);
        setState("browse");
        setStatusMessage("Created!");
        setTimeout(() => setStatusMessage(null), 2000);
      }
    } catch (err: any) {
      setError(`Failed to save session: ${err.message}`);
      setState("error");
    }
  };

  // Calculate total planned time
  const totalMinutes = selectedItems.reduce(
    (sum, s) => sum + s.plannedMinutes,
    0
  );

  if (state === "loading") {
    return (
      <box flexDirection="column" padding={1}>
        <text>Loading Practice Library...</text>
      </box>
    );
  }

  if (state === "error") {
    return (
      <box flexDirection="column" padding={1}>
        <text fg="#ff6b6b">Error: {error}</text>
        <text fg="#888888">Press Ctrl+C to exit</text>
      </box>
    );
  }

  if (state === "creating") {
    return (
      <box flexDirection="column" padding={1}>
        <text>Creating practice session...</text>
      </box>
    );
  }

  if (state === "saving") {
    return (
      <box flexDirection="column" padding={1}>
        <text>Saving changes...</text>
      </box>
    );
  }

  const displayItems = filteredItems.slice(0, 20);

  const displaySessions = sessions.slice(0, 10);

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
        {/* Library list */}
        <box
          flexDirection="column"
          width="45%"
          borderStyle="rounded"
          borderColor={focusArea === "list" || focusArea === "search" ? "#74c0fc" : "#444444"}
          padding={1}
        >
          <text fg="#74c0fc">
            <b>Library</b>
            <span fg="#888888"> ({filteredItems.length})</span>
          </text>

          {/* Search input inside library pane */}
          <box marginTop={1}>
            <text fg="#888888">/</text>
            <input
              value={searchQuery}
              onInput={setSearchQuery}
              placeholder="search..."
              focused={focusArea === "search"}
              width={30}
            />
          </box>

          <box flexDirection="column" marginTop={1}>
            {displayItems.map((item, idx) => {
              const isSelected = selectedItems.some(
                (s) => s.item.id === item.id
              );
              const isCursor = idx === cursorIndex && focusArea === "list";

              return (
                <box key={item.id}>
                  <text
                    bg={isCursor ? "#333333" : undefined}
                    fg={isSelected ? "#69db7c" : "#ffffff"}
                  >
                    {isSelected ? "[x] " : "[ ] "}
                    {item.name}
                    {item.type && (
                      <span fg="#888888"> ({item.type})</span>
                    )}
                  </text>
                </box>
              );
            })}
            {filteredItems.length > 20 && (
              <text fg="#666666">
                ... +{filteredItems.length - 20} more
              </text>
            )}
          </box>
        </box>

        {/* Sessions panel */}
        <box
          flexDirection="column"
          width="20%"
          borderStyle="rounded"
          borderColor={focusArea === "sessions" ? "#74c0fc" : "#444444"}
          padding={1}
          marginLeft={1}
        >
          <text fg="#b197fc">
            <b>Sessions</b>
          </text>

          <box flexDirection="column" marginTop={1}>
            {/* New Session option */}
            <box>
              <text
                bg={sessionCursorIndex === 0 && focusArea === "sessions" ? "#333333" : undefined}
                fg={activeSessionId === null ? "#69db7c" : "#ffffff"}
              >
                {activeSessionId === null ? "▶ " : "  "}New Session
              </text>
            </box>
            {/* Existing sessions */}
            {displaySessions.map((session, idx) => {
              const isActive = activeSessionId === session.id;
              const isCursor = idx + 1 === sessionCursorIndex && focusArea === "sessions";
              return (
                <box key={session.id}>
                  <text
                    bg={isCursor ? "#333333" : undefined}
                    fg={isActive ? "#69db7c" : "#888888"}
                  >
                    {isActive ? "▶ " : "  "}{session.date}
                  </text>
                </box>
              );
            })}
          </box>
        </box>

        {/* Selected items panel */}
        <box
          flexDirection="column"
          width="35%"
          borderStyle="rounded"
          borderColor={focusArea === "selected" ? "#74c0fc" : "#ffa94d"}
          padding={1}
          marginLeft={1}
        >
          <text fg="#ffa94d">
            <b>{activeSessionId ? "Edit" : "New"}</b>
            <span fg="#888888">
              {" "}({selectedItems.length}) {totalMinutes}m
            </span>
          </text>

          <box flexDirection="column" marginTop={1}>
            {selectedItems.map((sel, idx) => {
              const isCursor = idx === selectedPanelIndex && focusArea === "selected";
              return (
                <box key={sel.item.id}>
                  <text
                    bg={isCursor ? "#333333" : undefined}
                    fg="#69db7c"
                  >
                    {isCursor ? "▶ " : "  "}
                    {sel.item.name}
                    <span fg="#888888"> {sel.plannedMinutes}m</span>
                  </text>
                </box>
              );
            })}
          </box>

          {selectedItems.length > 0 && (
            <box marginTop={2}>
              <text bg="#69db7c" fg="#000000">
                <b> [s] {activeSessionId ? "Save" : "Create"} </b>
              </text>
            </box>
          )}
        </box>
      </box>

      {/* Footer */}
      <box marginTop={1}>
        <text fg="#666666">
          [j/k] Nav [Space] Select [^h/l] Pane [/] Search [+/-] Time [x] Remove [s] Save [r] Refresh
        </text>
      </box>
    </box>
  );
}
