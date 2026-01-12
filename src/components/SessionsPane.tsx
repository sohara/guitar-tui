import React from "react";
import type { PracticeSession } from "../notion/types";
import type { FocusArea } from "../types";

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
