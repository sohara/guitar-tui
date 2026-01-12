// Types representing your Notion database structures

export type ItemType = "Song" | "Exercise" | "Course Lesson";
export type Frequency = "Daily" | "Weekly" | "Monthly";

export interface PracticeLibraryItem {
  id: string;
  name: string;
  type: ItemType | null;
  artist: string | null;
  tags: string[];
  frequency: Frequency[];
  current: boolean;
  lastPracticed: string | null;
  timesPracticed: number | null;
}

export interface PracticeSession {
  id: string;
  name: string;
  date: string;
}

export interface PracticeLog {
  id: string;
  name: string;
  itemId: string;
  sessionId: string;
  plannedTime: number | null;
  actualTime: number | null;
}

// For creating new entries
export interface NewPracticeSession {
  name: string;
  date: string; // ISO date string YYYY-MM-DD
}

export interface NewPracticeLog {
  name: string;
  itemId: string; // Practice Library item page ID
  sessionId: string; // Practice Session page ID
  plannedTime: number;
}

// Selection state for UI
export interface SelectedItem {
  item: PracticeLibraryItem;
  plannedMinutes: number;
  logId?: string; // Present when editing existing log, absent for new items
}
