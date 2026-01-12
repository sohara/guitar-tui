import { useState, useEffect, useCallback } from "react";
import Fuse from "fuse.js";
import {
  fetchPracticeLibrary,
  fetchPracticeSessions,
} from "../notion/client";
import type { PracticeLibraryItem, PracticeSession } from "../notion/types";
import type { AppState } from "../types";
import { config } from "../config";

export interface NotionData {
  // State
  state: AppState;
  error: string | null;
  library: PracticeLibraryItem[];
  sessions: PracticeSession[];

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredItems: PracticeLibraryItem[];

  // Actions
  refresh: () => Promise<void>;
  setSessions: (sessions: PracticeSession[]) => void;
  setState: (state: AppState) => void;
  setError: (error: string | null) => void;
}

export function useNotionData(): NotionData {
  const [state, setState] = useState<AppState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<PracticeLibraryItem[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fuse, setFuse] = useState<Fuse<PracticeLibraryItem> | null>(null);

  // Initialize Fuse search when library changes
  const initFuse = useCallback((items: PracticeLibraryItem[]) => {
    setFuse(
      new Fuse(items, {
        keys: ["name", "artist", "tags", "type"],
        threshold: 0.4,
      })
    );
  }, []);

  // Load data on mount
  useEffect(() => {
    if (!config.notion.apiKey) {
      setError("NOTION_API_KEY environment variable not set");
      setState("error");
      return;
    }

    Promise.all([fetchPracticeLibrary(), fetchPracticeSessions()])
      .then(([items, fetchedSessions]) => {
        setLibrary(items);
        initFuse(items);
        setSessions(fetchedSessions);
        setState("browse");
      })
      .catch((err) => {
        setError(`Failed to load data: ${err.message}`);
        setState("error");
      });
  }, [initFuse]);

  // Refresh data
  const refresh = useCallback(async () => {
    setState("loading");
    try {
      const [items, fetchedSessions] = await Promise.all([
        fetchPracticeLibrary(),
        fetchPracticeSessions(),
      ]);
      setLibrary(items);
      initFuse(items);
      setSessions(fetchedSessions);
      setState("browse");
    } catch (err: any) {
      setError(`Failed to refresh: ${err.message}`);
      setState("error");
    }
  }, [initFuse]);

  // Filter items based on search
  const filteredItems =
    searchQuery && fuse
      ? fuse.search(searchQuery).map((r) => r.item)
      : library;

  return {
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
  };
}
