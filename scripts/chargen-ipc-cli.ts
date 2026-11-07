#!/usr/bin/env bun
/**
 * CharGenUI Unix Domain Socket CLI Utility.
 * Allows quick interaction with the backend via Unix Domain Socket.
 *
 * Usage:
 *   bun scripts/chargen-ipc-cli.ts ping
 *   bun scripts/chargen-ipc-cli.ts status
 *   bun scripts/chargen-ipc-cli.ts card
 *   bun scripts/chargen-ipc-cli.ts themes
 *   bun scripts/chargen-ipc-cli.ts suggest "An aloof cybernetic operative" --themes "Slow Burn,Dark Romance"
 *   bun scripts/chargen-ipc-cli.ts listen
 */

import { CharGenUnixClient } from "../src/services/ipc/unix-client";

const args = process.argv.slice(2);
const command = args[0] || "status";

const client = new CharGenUnixClient();

async function main() {
  try {
    await client.connect();

    switch (command) {
      case "ping": {
        const res = await client.ping();
        console.log("✓ Pong received from server:", res);
        client.close();
        break;
      }

      case "status": {
        const res = await client.getStatus();
        console.log("CharGenUI Dual-Bind IPC Status:");
        console.log(JSON.stringify(res, null, 2));
        client.close();
        break;
      }

      case "card": {
        const res = await client.getActiveCard();
        console.log("Active Roleplay Character Card:");
        console.log(JSON.stringify(res.character, null, 2));
        client.close();
        break;
      }

      case "themes": {
        const res = await client.getThemes();
        console.log("Preset Themes Count:", res.themes?.length);
        console.log(res.themes);
        client.close();
        break;
      }

      case "suggest": {
        const concept = args[1];
        if (!concept) {
          console.error("Error: Please provide a concept string. Example: bun scripts/chargen-ipc-cli.ts suggest 'Concept...'");
          process.exit(1);
        }
        let themes: string[] = [];
        const themesIdx = args.indexOf("--themes");
        if (themesIdx !== -1 && args[themesIdx + 1]) {
          themes = args[themesIdx + 1].split(",").map((t) => t.trim());
        }
        let era: string | undefined;
        const eraIdx = args.indexOf("--era");
        if (eraIdx !== -1 && args[eraIdx + 1]) {
          era = args[eraIdx + 1].trim();
        }

        console.log(`Pushing concept to CharGenUI via Unix Socket: "${concept}"`);
        const res = await client.suggestConcept({
          concept,
          themes,
          era,
          suggestedBy: "CharGen Unix CLI",
          autoGenerate: false,
        });
        console.log("✓ Concept queued successfully:", res.idea.id);
        console.log(JSON.stringify(res.idea, null, 2));
        client.close();
        break;
      }

      case "listen": {
        console.log(`🎧 Listening for live events on Unix Socket: ${client.getSocketPath()}`);
        console.log("Press Ctrl+C to stop.");
        client.on("message", (msg) => {
          console.log(`[${msg.timestamp}] EVENT: ${msg.type}`);
          console.log(JSON.stringify(msg.payload, null, 2));
          console.log("-----------------------------------------");
        });
        // Keep process open
        await new Promise(() => {});
        break;
      }

      default:
        console.log(`Unknown command: ${command}`);
        console.log("Available commands: ping, status, card, themes, suggest, listen");
        client.close();
        process.exit(1);
    }
  } catch (err: any) {
    console.error("IPC Unix Socket Error:", err.message);
    client.close();
    process.exit(1);
  }
}

main();
