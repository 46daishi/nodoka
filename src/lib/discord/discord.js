import { invoke } from "@tauri-apps/api/core";

const DISCORD_CLIENT_ID = "1465698700524257414"; // Replace with your Discord App ID

export class DiscordRPC {
  constructor() {
    this.connected = false;
  }

  async connect() {
    try {
      await invoke("connect_discord", { clientId: DISCORD_CLIENT_ID });
      this.connected = true;
      console.log("Discord RPC connected");
    } catch (error) {
      console.error("Failed to connect to Discord:", error);
      throw error;
    }
  }

  async updatePresence(options) {
    if (!this.connected) {
      throw new Error("Discord RPC not connected");
    }

    try {
      await invoke("update_discord_presence", {
        details: options.details,
        status: options.status,
        largeImage: options.largeImage,
        largeText: options.largeText,
        smallImage: options.smallImage,
        smallText: options.smallText,
        startTimestamp: options.startTimestamp,
        endTimestamp: options.endTimestamp,
      });
    } catch (error) {
      console.error("Failed to update Discord presence:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connected) {
      try {
        await invoke("disconnect_discord");
        this.connected = false;
        console.log("Discord RPC disconnected");
      } catch (error) {
        console.error("Failed to disconnect from Discord:", error);
      }
    }
  }
}

export const discordRPC = new DiscordRPC();
