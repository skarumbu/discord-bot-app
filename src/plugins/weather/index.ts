import { SlashCommandBuilder } from 'discord.js';
import type { InProcessAdapter, CommandContext, PluginResponse } from '../../types/index.js';

const weatherPlugin: InProcessAdapter = {
  commands: ['weather'],

  slashCommandDefinitions: [
    new SlashCommandBuilder()
      .setName('weather')
      .setDescription('Get current weather for a US zip code')
      .addStringOption((option) =>
        option
          .setName('zipcode')
          .setDescription('US zip code')
          .setRequired(true)
      )
      .toJSON(),
  ],

  async execute(ctx: CommandContext): Promise<PluginResponse> {
    const zipcode = ctx.args['zipcode'];
    try {
      const response = await fetch(`https://wttr.in/${encodeURIComponent(zipcode)}?format=3`);
      if (!response.ok) {
        return { content: "Couldn't fetch weather. Try again." };
      }
      const weather = await response.text();
      return { content: weather.trim() };
    } catch {
      return { content: "Couldn't fetch weather. Try again." };
    }
  },
};

export default weatherPlugin;
