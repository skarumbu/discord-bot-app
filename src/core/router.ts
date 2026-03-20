import type { CommandContext, PluginResponse, InProcessAdapter } from '../types/index.js';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

export class CommandRouter {
  private plugins = new Map<string, InProcessAdapter>();
  private registeredPlugins: InProcessAdapter[] = [];

  register(plugin: InProcessAdapter): void {
    this.registeredPlugins.push(plugin);
    for (const command of plugin.commands) {
      this.plugins.set(command, plugin);
    }
  }

  getSlashCommandDefinitions(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    return this.registeredPlugins.flatMap((p) => p.slashCommandDefinitions);
  }

  async dispatch(ctx: CommandContext): Promise<PluginResponse> {
    const plugin = this.plugins.get(ctx.command);
    if (!plugin) {
      return { content: 'Unknown command.', ephemeral: true };
    }
    return plugin.execute(ctx);
  }
}
