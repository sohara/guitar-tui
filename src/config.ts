// Database IDs from your Notion workspace
export const config = {
  notion: {
    // Set via environment variable: NOTION_API_KEY
    apiKey: process.env.NOTION_API_KEY || "",

    // Data source IDs (collection IDs) - used for querying
    dataSources: {
      practiceLibrary: "2d709433-8b1b-804c-897c-000b76c9e481",
      practiceSessions: "f4658dc0-2eb2-43fe-b268-1bba231c0156",
      practiceLogs: "2d709433-8b1b-809b-bae2-000b1343e18f",
    },

    // Database IDs (from URLs) - used for creating pages
    databases: {
      practiceLibrary: "2d7094338b1b80ea8a42f746682bf965",
      practiceSessions: "7c39d1ff5e2e4458be4c5cded1bc485d",
      practiceLogs: "2d7094338b1b80bf9e69fd78ecf57f44",
    },

    // Template IDs
    templates: {
      practiceSession: "2d7094338b1b8030a56fcca068c6f46c",
    },
  },
};
