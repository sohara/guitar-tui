import { useState, useEffect, useCallback, useMemo } from "react";
import Fuse from "fuse.js";
import {
  fetchPracticeLibrary,
  fetchPracticeSessions,
} from "../notion/client";
import type { PracticeLibraryItem, PracticeSession, ItemType } from "../notion/types";
import type { AppState, SortField } from "../types";
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

  // Sort/filter
  sortField: SortField;
  sortAsc: boolean;
  typeFilter: ItemType | null;
  setSortField: (field: SortField) => void;
  setSortAsc: (asc: boolean) => void;
  setTypeFilter: (type: ItemType | null) => void;
  cycleSortField: (field: SortField) => void;
  cycleTypeFilter: () => void;

  // Actions
  refresh: () => Promise<void>;
  setSessions: (sessions: PracticeSession[]) => void;
  setState: (state: AppState) => void;
  setError: (error: string | null) => void;
}

// Type filter cycle order
const TYPE_CYCLE: (ItemType | null)[] = [null, "Song", "Exercise", "Course Lesson"];

export function useNotionData(): NotionData {
  const [state, setState] = useState<AppState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<PracticeLibraryItem[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fuse, setFuse] = useState<Fuse<PracticeLibraryItem> | null>(null);

  // Sort/filter state - default to last practiced descending
  const [sortField, setSortField] = useState<SortField>("lastPracticed");
  const [sortAsc, setSortAsc] = useState(false); // descending = most recent first
  const [typeFilter, setTypeFilter] = useState<ItemType | null>(null);

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

  // Cycle sort field (same field reverses direction)
  const cycleSortField = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortAsc((asc) => !asc);
    } else {
      setSortField(field);
      // Set sensible default direction for each field
      setSortAsc(field === "name"); // name asc, others desc
    }
  }, [sortField]);

  // Cycle type filter
  const cycleTypeFilter = useCallback(() => {
    setTypeFilter((current) => {
      const idx = TYPE_CYCLE.indexOf(current);
      return TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length];
    });
  }, []);

  // Filter and sort pipeline: Type Filter → Search Filter → Sort
  const filteredItems = useMemo(() => {
    // 1. Type filter
    let items = typeFilter
      ? library.filter((i) => i.type === typeFilter)
      : library;

    // 2. Search filter
    if (searchQuery && fuse) {
      // Need to search within filtered items, not full library
      const searchFuse = new Fuse(items, {
        keys: ["name", "artist", "tags", "type"],
        threshold: 0.4,
      });
      items = searchFuse.search(searchQuery).map((r) => r.item);
    }

    // 3. Sort
    const sorted = [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "lastPracticed":
          // Null dates go to the end
          if (!a.lastPracticed && !b.lastPracticed) cmp = 0;
          else if (!a.lastPracticed) cmp = 1;
          else if (!b.lastPracticed) cmp = -1;
          else cmp = a.lastPracticed.localeCompare(b.lastPracticed);
          break;
        case "timesPracticed":
          cmp = (a.timesPracticed ?? 0) - (b.timesPracticed ?? 0);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return sorted;
  }, [library, typeFilter, searchQuery, fuse, sortField, sortAsc]);

  return {
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
    setSortField,
    setSortAsc,
    setTypeFilter,
    cycleSortField,
    cycleTypeFilter,
    refresh,
    setSessions,
    setState,
    setError,
  };
}
