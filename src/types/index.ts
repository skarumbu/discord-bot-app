import type { APIEmbed } from 'discord.js';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

export interface CommandContext {
  command: string;
  args: Record<string, string>;
  context: {
    guildId: string;
    channelId: string;
    invokingUserId: string;
    invokingUserName: string;
  };
}

export interface PluginResponse {
  content: string; // Use "" for embed-only responses
  embeds?: APIEmbed[];
  ephemeral?: boolean; // Core translates to MessageFlags.Ephemeral
}

export interface InProcessAdapter {
  commands: string[];
  slashCommandDefinitions: RESTPostAPIChatInputApplicationCommandsJSONBody[];
  execute(ctx: CommandContext): Promise<PluginResponse>;
}
