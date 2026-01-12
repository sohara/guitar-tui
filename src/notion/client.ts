import { Client } from "@notionhq/client";
import { config } from "../config";
import type {
  PracticeLibraryItem,
  PracticeSession,
  PracticeLog,
  NewPracticeSession,
  NewPracticeLog,
  ItemType,
  Frequency,
} from "./types";

const notion = new Client({ auth: config.notion.apiKey });
const dataSources = config.notion.dataSources; // For querying
const databases = config.notion.databases; // For creating pages

// Helper to extract text from Notion rich text
function getRichText(prop: any): string {
  if (!prop?.rich_text?.length) return "";
  return prop.rich_text.map((t: any) => t.plain_text).join("");
}

// Helper to extract title
function getTitle(prop: any): string {
  if (!prop?.title?.length) return "";
  return prop.title.map((t: any) => t.plain_text).join("");
}

// Helper to extract select value
function getSelect(prop: any): string | null {
  return prop?.select?.name || null;
}

// Helper to extract multi-select values
function getMultiSelect(prop: any): string[] {
  if (!prop?.multi_select?.length) return [];
  return prop.multi_select.map((s: any) => s.name);
}

// Helper to extract checkbox
function getCheckbox(prop: any): boolean {
  return prop?.checkbox || false;
}

// Helper to extract number
function getNumber(prop: any): number | null {
  return prop?.number ?? null;
}

// Helper to extract date
function getDate(prop: any): string | null {
  return prop?.date?.start || null;
}

// Helper to extract formula result
function getFormula(prop: any): any {
  if (!prop?.formula) return null;
  const f = prop.formula;
  if (f.type === "string") return f.string;
  if (f.type === "number") return f.number;
  if (f.type === "boolean") return f.boolean;
  if (f.type === "date") return f.date?.start;
  return null;
}

// Helper to extract rollup result
function getRollup(prop: any): any {
  if (!prop?.rollup) return null;
  const r = prop.rollup;
  if (r.type === "number") return r.number;
  if (r.type === "array") return r.array;
  return null;
}

// Helper to extract relation IDs
function getRelation(prop: any): string[] {
  if (!prop?.relation?.length) return [];
  return prop.relation.map((r: any) => r.id);
}

export async function fetchPracticeLibrary(): Promise<PracticeLibraryItem[]> {
  const items: PracticeLibraryItem[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSources.practiceLibrary,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of response.results) {
      if (!("properties" in page)) continue;
      const props = page.properties;

      items.push({
        id: page.id,
        name: getTitle(props.Name),
        type: getSelect(props.Type) as ItemType | null,
        artist: getRichText(props.Artist) || null,
        tags: getMultiSelect(props.Tags),
        frequency: getMultiSelect(props.Frequency) as Frequency[],
        current: getCheckbox(props.Current),
        lastPracticed: getFormula(props["Last Practiced"]),
        timesPracticed: getRollup(props["Times Practiced"]),
      });
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return items;
}

export async function createPracticeSession(
  session: NewPracticeSession
): Promise<PracticeSession> {
  const response = await notion.pages.create({
    parent: { database_id: databases.practiceSessions },
    properties: {
      Session: {
        title: [{ text: { content: session.name } }],
      },
      Date: {
        date: { start: session.date },
      },
    },
    // Use the Practice template for the linked database view
    template: {
      type: "template_id",
      template_id: config.notion.templates.practiceSession,
    },
  } as any); // Type assertion needed as SDK types may not include template

  return {
    id: response.id,
    name: session.name,
    date: session.date,
  };
}

export async function createPracticeLog(log: NewPracticeLog): Promise<string> {
  const response = await notion.pages.create({
    parent: { database_id: databases.practiceLogs },
    properties: {
      Name: {
        title: [{ text: { content: log.name } }],
      },
      Item: {
        relation: [{ id: log.itemId }],
      },
      Session: {
        relation: [{ id: log.sessionId }],
      },
      "Planned Time (min)": {
        number: log.plannedTime,
      },
    },
  });

  return response.id;
}

// Create a full practice session with all logs
export async function createFullSession(
  sessionName: string,
  date: string,
  items: Array<{ item: PracticeLibraryItem; plannedMinutes: number }>
): Promise<{ session: PracticeSession; logIds: string[] }> {
  // Create the session first
  const session = await createPracticeSession({ name: sessionName, date });

  // Create all practice logs
  const logIds: string[] = [];
  for (const { item, plannedMinutes } of items) {
    const logId = await createPracticeLog({
      name: item.name,
      itemId: item.id,
      sessionId: session.id,
      plannedTime: plannedMinutes,
    });
    logIds.push(logId);
  }

  return { session, logIds };
}

// Fetch recent practice sessions (sorted by date descending)
export async function fetchPracticeSessions(): Promise<PracticeSession[]> {
  const sessions: PracticeSession[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSources.practiceSessions,
      start_cursor: cursor,
      page_size: 100,
      sorts: [{ property: "Date", direction: "descending" }],
    } as any);

    for (const page of response.results) {
      if (!("properties" in page)) continue;
      const props = page.properties;

      sessions.push({
        id: page.id,
        name: getTitle(props.Session),
        date: getDate(props.Date) || "",
      });
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return sessions;
}

// Fetch practice logs for a specific session
export async function fetchPracticeLogsBySession(
  sessionId: string
): Promise<PracticeLog[]> {
  const logs: PracticeLog[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSources.practiceLogs,
      start_cursor: cursor,
      page_size: 100,
      filter: {
        property: "Session",
        relation: { contains: sessionId },
      },
    } as any);

    for (const page of response.results) {
      if (!("properties" in page)) continue;
      const props = page.properties;

      const itemIds = getRelation(props.Item);
      const sessionIds = getRelation(props.Session);

      logs.push({
        id: page.id,
        name: getTitle(props.Name),
        itemId: itemIds[0] || "",
        sessionId: sessionIds[0] || "",
        plannedTime: getNumber(props["Planned Time (min)"]),
        actualTime: getNumber(props["Actual Time (min)"]),
      });
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return logs;
}

// Update a practice log's planned time
export async function updatePracticeLog(
  logId: string,
  plannedTime: number
): Promise<void> {
  await notion.pages.update({
    page_id: logId,
    properties: {
      "Planned Time (min)": { number: plannedTime },
    },
  });
}

// Delete (archive) a practice log
export async function deletePracticeLog(logId: string): Promise<void> {
  await notion.pages.update({
    page_id: logId,
    archived: true,
  });
}
