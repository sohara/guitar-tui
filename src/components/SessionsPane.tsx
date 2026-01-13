import React from "react";
import type { PracticeSession, PracticeLibraryItem } from "../notion/types";
import type { FocusArea, KeyEvent, KeyHandler } from "../types";

// Keyboard hints
export const SESSIONS_HINTS = "[j/k] Nav [Space] Select";

// Sessions keyboard handler params
interface SessionsKeyParams {
  cursorIndex: number;
  setCursorIndex: React.Dispatch<React.SetStateAction<number>>;
  sessions: PracticeSession[];
  clearSession: () => void;
  selectSession: (id: string, sessions: PracticeSession[]) => void;
  loadSessionLogs: (id: string, library: PracticeLibraryItem[]) => void;
  library: PracticeLibraryItem[];
}

export function createSessionsKeyHandler(params: SessionsKeyParams): KeyHandler {
  const {
    cursorIndex,
    setCursorIndex,
    sessions,
    clearSession,
    selectSession,
    loadSessionLogs,
    library,
  } = params;

  return (key: KeyEvent): boolean => {
    switch (key.name) {
      case "up":
      case "k":
        setCursorIndex((i) => Math.max(0, i - 1));
        return true;
      case "down":
      case "j":
        setCursorIndex((i) => Math.min(sessions.length, i + 1));
        return true;
      case "space":
      case "return":
        if (cursorIndex === 0) {
          clearSession();
        } else {
          const session = sessions[cursorIndex - 1];
          if (session) {
            selectSession(session.id, sessions);
            loadSessionLogs(session.id, library);
          }
        }
        return true;
    }
    return false;
  };
}

interface SessionsPaneProps {
  sessions: PracticeSession[];
  activeSessionId: string | null;
  cursorIndex: number;
  focusArea: FocusArea;
}

export function SessionsPane({
  sessions,
  activeSessionId,
  cursorIndex,
  focusArea,
}: SessionsPaneProps) {
  const isFocused = focusArea === "sessions";
  const displaySessions = sessions.slice(0, 10);

  return (
    <box
      flexDirection="column"
      width="20%"
      borderStyle="rounded"
      borderColor={isFocused ? "#74c0fc" : "#444444"}
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
            bg={cursorIndex === 0 && isFocused ? "#333333" : undefined}
            fg={activeSessionId === null ? "#69db7c" : "#ffffff"}
          >
            {activeSessionId === null ? "▶ " : "  "}New Session
          </text>
        </box>

        {/* Existing sessions */}
        {displaySessions.map((session, idx) => {
          const isActive = activeSessionId === session.id;
          const isCursor = idx + 1 === cursorIndex && isFocused;

          return (
            <box key={session.id}>
              <text
                bg={isCursor ? "#333333" : undefined}
                fg={isActive ? "#69db7c" : "#888888"}
              >
                {isActive ? "▶ " : "  "}
                {session.date}
              </text>
            </box>
          );
        })}
      </box>
    </box>
  );
}
