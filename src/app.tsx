import React, { useState, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import Fuse from "fuse.js";
import { fetchPracticeLibrary, createFullSession } from "./notion/client";
import type { PracticeLibraryItem, SelectedItem } from "./notion/types";
import { config } from "./config";

type AppState = "loading" | "browse" | "creating" | "done" | "error";

export function App() {
  const [state, setState] = useState<AppState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<PracticeLibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [fuse, setFuse] = useState<Fuse<PracticeLibraryItem> | null>(null);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [focusArea, setFocusArea] = useState<"search" | "list" | "selected">("list");

  // Load the practice library on mount
  useEffect(() => {
    if (!config.notion.apiKey) {
      setError("NOTION_API_KEY environment variable not set");
      setState("error");
      return;
    }

    fetchPracticeLibrary()
      .then((items) => {
        setLibrary(items);
        setFuse(
          new Fuse(items, {
            keys: ["name", "artist", "tags", "type"],
            threshold: 0.4,
          })
        );
        setState("browse");
      })
      .catch((err) => {
        setError(`Failed to load library: ${err.message}`);
        setState("error");
      });
  }, []);

  // Filter items based on search (show all if no query)
  const filteredItems =
    searchQuery && fuse
      ? fuse.search(searchQuery).map((r) => r.item)
      : library;

  // Keyboard navigation
  useKeyboard((key) => {
    if (state !== "browse") return;

    // Tab always works to switch focus
    if (key.name === "tab") {
      setFocusArea((f) => (f === "list" ? "search" : "list"));
      return;
    }

    // Escape returns to list from search
    if (key.name === "escape" && focusArea === "search") {
      setFocusArea("list");
      return;
    }

    // Other shortcuts only work when NOT focused on search input
    if (focusArea === "search") return;

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
      case "c":
        if (selectedItems.length > 0) {
          handleCreateSession();
        }
        break;
      case "r":
        // Refresh library
        setState("loading");
        fetchPracticeLibrary()
          .then((items) => {
            setLibrary(items);
            setFuse(
              new Fuse(items, {
                keys: ["name", "artist", "tags", "type"],
                threshold: 0.4,
              })
            );
            setState("browse");
          })
          .catch((err) => {
            setError(`Failed to refresh: ${err.message}`);
            setState("error");
          });
        break;
      case "/":
        // Quick shortcut to focus search
        setFocusArea("search");
        break;
    }
  });

  const handleCreateSession = async () => {
    if (selectedItems.length === 0) return;

    setState("creating");
    const today = new Date().toISOString().split("T")[0];
    const sessionName = `Practice ${today}`;

    try {
      await createFullSession(sessionName, today, selectedItems);
      setState("done");
    } catch (err: any) {
      setError(`Failed to create session: ${err.message}`);
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

  if (state === "done") {
    return (
      <box flexDirection="column" padding={1}>
        <text fg="#69db7c">Session created successfully!</text>
        <text fg="#888888">
          Created {selectedItems.length} practice logs ({totalMinutes} minutes
          planned)
        </text>
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

  const displayItems = filteredItems.slice(0, 20);

  return (
    <box flexDirection="column" height="100%" padding={1}>
      {/* Header */}
      <box>
        <text fg="#ffd43b">
          <b>Guitar Practice Session Builder</b>
        </text>
      </box>

      {/* Search area */}
      <box marginTop={1}>
        <text fg="#888888">Search: </text>
        <input
          value={searchQuery}
          onInput={setSearchQuery}
          placeholder="Type to filter..."
          focused={focusArea === "search"}
          width={40}
        />
      </box>

      {/* Main content */}
      <box flexDirection="row" flexGrow={1} marginTop={1}>
        {/* Library list */}
        <box
          flexDirection="column"
          width="60%"
          borderStyle="rounded"
          borderColor={focusArea === "list" ? "#74c0fc" : "#444444"}
          padding={1}
        >
          <text fg="#74c0fc">
            <b>Practice Library</b>
            <span fg="#888888"> ({filteredItems.length} items)</span>
          </text>

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
                ... and {filteredItems.length - 20} more
              </text>
            )}
          </box>
        </box>

        {/* Selected items panel */}
        <box
          flexDirection="column"
          width="40%"
          borderStyle="rounded"
          borderColor="#ffa94d"
          padding={1}
          marginLeft={1}
        >
          <text fg="#ffa94d">
            <b>Selected</b>
            <span fg="#888888">
              {" "}
              ({selectedItems.length}) - {totalMinutes} min
            </span>
          </text>

          <box flexDirection="column" marginTop={1}>
            {selectedItems.map((sel) => (
              <box key={sel.item.id}>
                <text fg="#69db7c">
                  {sel.item.name}
                  <span fg="#888888"> ({sel.plannedMinutes}m)</span>
                </text>
              </box>
            ))}
          </box>

          {selectedItems.length > 0 && (
            <box marginTop={2}>
              <text bg="#69db7c" fg="#000000">
                <b> [c] Create Session </b>
              </text>
            </box>
          )}
        </box>
      </box>

      {/* Footer */}
      <box marginTop={1}>
        <text fg="#666666">
          [j/k] Navigate [Space] Select [/] Search [Tab] Switch focus [Esc] Back [c] Create [r] Refresh [Ctrl+C] Exit
        </text>
      </box>
    </box>
  );
}
