import React from "react";
import type { PracticeSession, PracticeLibraryItem } from "../notion/types";
import type { KeyEvent, KeyHandler } from "../types";

// Keyboard hints
export const SESSION_PICKER_HINTS = "[j/k] Nav [Enter] Select [Esc] Cancel";

// Session picker keyboard handler params
interface SessionPickerKeyParams {
  cursorIndex: number;
  setCursorIndex: React.Dispatch<React.SetStateAction<number>>;
  sessions: PracticeSession[];
  clearSession: () => void;
  selectSession: (id: string, sessions: PracticeSession[]) => void;
  loadSessionLogs: (id: string, library: PracticeLibraryItem[]) => void;
  library: PracticeLibraryItem[];
  onClose: () => void;
}

export function createSessionPickerKeyHandler(params: SessionPickerKeyParams): KeyHandler {
  const {
    cursorIndex,
    setCursorIndex,
    sessions,
    clearSession,
    selectSession,
    loadSessionLogs,
    library,
    onClose,
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
        onClose();
        return true;
      case "escape":
        onClose();
        return true;
    }
    return false;
  };
}

interface SessionPickerProps {
  sessions: PracticeSession[];
  activeSessionId: string | null;
  cursorIndex: number;
}

export function SessionPicker({
  sessions,
  activeSessionId,
  cursorIndex,
}: SessionPickerProps) {
  const displaySessions = sessions.slice(0, 10);

  return (
    <box
      flexDirection="column"
      width={30}
      borderStyle="rounded"
      borderColor="#74c0fc"
      padding={1}
      marginTop={1}
    >
      <text fg="#b197fc">
        <b>Select Session</b>
      </text>

      <box flexDirection="column" marginTop={1}>
        {/* New Session option */}
        <box>
          <text
            bg={cursorIndex === 0 ? "#333333" : undefined}
            fg={activeSessionId === null ? "#69db7c" : "#ffffff"}
          >
            {cursorIndex === 0 ? "▶ " : "  "}New Session
          </text>
        </box>

        {/* Existing sessions */}
        {displaySessions.map((session, idx) => {
          const isActive = activeSessionId === session.id;
          const isCursor = idx + 1 === cursorIndex;

          return (
            <box key={session.id}>
              <text
                bg={isCursor ? "#333333" : undefined}
                fg={isActive ? "#69db7c" : "#888888"}
              >
                {isCursor ? "▶ " : "  "}
                {session.date}
                {isActive && " (current)"}
              </text>
            </box>
          );
        })}
      </box>
    </box>
  );
}
