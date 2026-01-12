import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./app";

async function main() {
  const renderer = await createCliRenderer({
    useThread: false, // Disable threading to avoid potential SIGBUS crashes
  });
  const root = createRoot(renderer);

  // Render the React app
  root.render(<App />);

  // Start the render loop
  renderer.start();

  // Handle exit on Ctrl+C
  process.on("SIGINT", () => {
    root.unmount();
    renderer.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Error starting app:", err);
  process.exit(1);
});
