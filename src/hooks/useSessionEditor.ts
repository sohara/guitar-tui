import { useState, useCallback } from "react";
import {
  fetchPracticeLogsBySession,
  fetchPracticeSessions,
  createFullSession,
  createPracticeLog,
  updatePracticeLog,
  deletePracticeLog,
} from "../notion/client";
import type {
  PracticeLibraryItem,
  PracticeSession,
  SelectedItem,
} from "../notion/types";
import type { AppState } from "../types";

export interface SessionEditor {
  // State
  selectedItems: SelectedItem[];
  originalItems: SelectedItem[];
  activeSessionId: string | null;
  activeSession: PracticeSession | null;
  statusMessage: string | null;
  setStatusMessage: (message: string | null) => void;
  totalMinutes: number;

  // Cursor state for selected panel
  selectedPanelIndex: number;
  setSelectedPanelIndex: (index: number | ((i: number) => number)) => void;

  // Session cursor state
  sessionCursorIndex: number;
  setSessionCursorIndex: (index: number | ((i: number) => number)) => void;

  // Time editing state
  isEditingTime: boolean;
  timeInputValue: string;
  startTimeEdit: () => void;
  appendTimeDigit: (digit: string) => void;
  backspaceTimeDigit: () => void;
  confirmTimeEdit: () => void;
  cancelTimeEdit: () => void;

  // Actions
  setSelectedItems: (items: SelectedItem[] | ((items: SelectedItem[]) => SelectedItem[])) => void;
  selectSession: (sessionId: string | null, sessions: PracticeSession[]) => void;
  loadSessionLogs: (sessionId: string, library: PracticeLibraryItem[]) => Promise<void>;
  toggleItem: (item: PracticeLibraryItem) => void;
  adjustTime: (index: number, delta: number) => void;
  removeItem: (index: number) => void;
  moveItem: (index: number, direction: "up" | "down") => void;
  saveSession: (
    sessions: PracticeSession[],
    setSessions: (sessions: PracticeSession[]) => void,
    setState: (state: AppState) => void,
    setError: (error: string | null) => void,
    library: PracticeLibraryItem[]
  ) => Promise<void>;
  clearSession: () => void;
}

export function useSessionEditor(sessions: PracticeSession[]): SessionEditor {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [originalItems, setOriginalItems] = useState<SelectedItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionCursorIndex, setSessionCursorIndex] = useState(0);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [timeInputValue, setTimeInputValue] = useState("");

  // Get active session object
  const activeSession = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId) || null
    : null;

  // Calculate total planned time
  const totalMinutes = selectedItems.reduce(
    (sum, s) => sum + s.plannedMinutes,
    0
  );

  // Load session logs
  const loadSessionLogs = useCallback(
    async (sessionId: string, library: PracticeLibraryItem[]) => {
      const logs = await fetchPracticeLogsBySession(sessionId);
      const items: SelectedItem[] = [];
      for (const log of logs) {
        const libraryItem = library.find((item) => item.id === log.itemId);
        if (libraryItem) {
          items.push({
            item: libraryItem,
            plannedMinutes: log.plannedTime || 5,
            actualMinutes: log.actualTime ?? undefined,
            logId: log.id,
          });
        }
      }
      setSelectedItems(items);
      setOriginalItems(JSON.parse(JSON.stringify(items)));
      setSelectedPanelIndex(0);
    },
    []
  );

  // Select a session (or null for new)
  const selectSession = useCallback(
    (sessionId: string | null, sessions: PracticeSession[]) => {
      if (sessionId === null) {
        setActiveSessionId(null);
        setSelectedItems([]);
        setOriginalItems([]);
      } else {
        setActiveSessionId(sessionId);
      }
    },
    []
  );

  // Toggle item selection
  const toggleItem = useCallback((item: PracticeLibraryItem) => {
    setSelectedItems((current) => {
      if (current.some((s) => s.item.id === item.id)) {
        return current.filter((s) => s.item.id !== item.id);
      } else {
        return [...current, { item, plannedMinutes: 5 }];
      }
    });
  }, []);

  // Adjust time for an item
  const adjustTime = useCallback((index: number, delta: number) => {
    setSelectedItems((current) => {
      if (!current[index]) return current;
      const newItems = [...current];
      newItems[index] = {
        ...newItems[index],
        plannedMinutes: Math.max(1, newItems[index].plannedMinutes + delta),
      };
      return newItems;
    });
  }, []);

  // Time editing functions
  const startTimeEdit = useCallback(() => {
    if (selectedItems.length === 0) return;
    setIsEditingTime(true);
    setTimeInputValue("");
  }, [selectedItems.length]);

  const appendTimeDigit = useCallback((digit: string) => {
    if (!/^[0-9]$/.test(digit)) return;
    setTimeInputValue((v) => {
      // Limit to 3 digits (max 999 minutes)
      if (v.length >= 3) return v;
      return v + digit;
    });
  }, []);

  const backspaceTimeDigit = useCallback(() => {
    setTimeInputValue((v) => v.slice(0, -1));
  }, []);

  const confirmTimeEdit = useCallback(() => {
    const minutes = parseInt(timeInputValue, 10);
    if (!isNaN(minutes) && minutes >= 1) {
      setSelectedItems((current) => {
        if (!current[selectedPanelIndex]) return current;
        const newItems = [...current];
        newItems[selectedPanelIndex] = {
          ...newItems[selectedPanelIndex],
          plannedMinutes: minutes,
        };
        return newItems;
      });
    }
    setIsEditingTime(false);
    setTimeInputValue("");
  }, [timeInputValue, selectedPanelIndex]);

  const cancelTimeEdit = useCallback(() => {
    setIsEditingTime(false);
    setTimeInputValue("");
  }, []);

  // Remove an item
  const removeItem = useCallback((index: number) => {
    setSelectedItems((current) => {
      const newItems = current.filter((_, i) => i !== index);
      return newItems;
    });
    setSelectedPanelIndex((i) => Math.max(0, Math.min(i, selectedItems.length - 2)));
  }, [selectedItems.length]);

  // Move an item up or down
  const moveItem = useCallback((index: number, direction: "up" | "down") => {
    setSelectedItems((current) => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= current.length) return current;

      const newItems = [...current];
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      return newItems;
    });
    // Move cursor with the item
    setSelectedPanelIndex((i) => {
      const newIndex = direction === "up" ? i - 1 : i + 1;
      if (newIndex < 0 || newIndex >= selectedItems.length) return i;
      return newIndex;
    });
  }, [selectedItems.length]);

  // Clear session state
  const clearSession = useCallback(() => {
    setActiveSessionId(null);
    setSelectedItems([]);
    setOriginalItems([]);
    setSelectedPanelIndex(0);
  }, []);

  // Save session (create or update)
  const saveSession = useCallback(
    async (
      sessions: PracticeSession[],
      setSessions: (sessions: PracticeSession[]) => void,
      setState: (state: AppState) => void,
      setError: (error: string | null) => void,
      library: PracticeLibraryItem[]
    ) => {
      if (selectedItems.length === 0 && !activeSessionId) return;

      setState(activeSessionId ? "saving" : "creating");

      try {
        if (activeSessionId) {
          // EDIT MODE: Apply changes to existing session
          const currentIds = new Set(
            selectedItems.filter((i) => i.logId).map((i) => i.logId)
          );

          // Delete removed items
          for (const orig of originalItems) {
            if (orig.logId && !currentIds.has(orig.logId)) {
              await deletePracticeLog(orig.logId);
            }
          }

          // Update changed items and create new items
          for (let i = 0; i < selectedItems.length; i++) {
            const item = selectedItems[i];
            if (item.logId) {
              // Find original position and check for changes
              const originalIndex = originalItems.findIndex((o) => o.logId === item.logId);
              const original = originalItems[originalIndex];
              const timeChanged = original && original.plannedMinutes !== item.plannedMinutes;
              const orderChanged = originalIndex !== i;

              if (timeChanged || orderChanged) {
                const updates: { plannedTime?: number; order?: number } = {};
                if (timeChanged) updates.plannedTime = item.plannedMinutes;
                if (orderChanged) updates.order = i;
                await updatePracticeLog(item.logId, updates);
              }
            } else {
              await createPracticeLog({
                name: item.item.name,
                itemId: item.item.id,
                sessionId: activeSessionId,
                plannedTime: item.plannedMinutes,
                order: i,
              });
            }
          }

          // Refresh sessions and reload current session logs
          const fetchedSessions = await fetchPracticeSessions();
          setSessions(fetchedSessions);
          await loadSessionLogs(activeSessionId, library);
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
          setActiveSessionId(result.session.id);
          await loadSessionLogs(result.session.id, library);
          setSessionCursorIndex(1);
          setState("browse");
          setStatusMessage("Created!");
          setTimeout(() => setStatusMessage(null), 2000);
        }
      } catch (err: any) {
        setError(`Failed to save session: ${err.message}`);
        setState("error");
      }
    },
    [activeSessionId, selectedItems, originalItems, loadSessionLogs]
  );

  return {
    selectedItems,
    originalItems,
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
    setSelectedItems,
    selectSession,
    loadSessionLogs,
    toggleItem,
    adjustTime,
    removeItem,
    moveItem,
    saveSession,
    clearSession,
  };
}
