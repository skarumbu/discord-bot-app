import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, MessageFlags } from 'discord.js';
import { CommandRouter } from './router.js';
import { discoverAndRegister } from './registry.js';
import type { CommandContext } from '../types/index.js';

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
  throw new Error(
    'Missing required environment variables: DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID'
  );
}

// Boot plugin registry
const router = new CommandRouter();
await discoverAndRegister(router);

// Register slash commands with Discord (guild-scoped, instant)
const rest = new REST().setToken(DISCORD_TOKEN);
const definitions = router.getSlashCommandDefinitions();
await rest
  .put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: definitions })
  .catch((err) => {
    console.error('[bot] failed to register slash commands:', err);
    process.exit(1);
  });
console.log(`[bot] registered ${definitions.length} slash command(s)`);

// Boot Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('error', (err) => {
  console.error('[bot] client error:', err);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'This bot only works in servers.' });
    return;
  }

  const args = Object.fromEntries(
    interaction.options.data.map((opt) => [opt.name, String(opt.value)])
  );

  const ctx: CommandContext = {
    command: interaction.commandName,
    args,
    context: {
      guildId: interaction.guildId,
      channelId: interaction.channelId ?? '',
      invokingUserId: interaction.user.id,
      invokingUserName: interaction.user.username,
    },
  };

  try {
    const response = await router.dispatch(ctx);
    await interaction.reply({
      content: response.content,
      embeds: response.embeds,
      flags: response.ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (err) {
    console.error('[bot] interaction handler error:', err);
    const replyFn = interaction.replied || interaction.deferred
      ? interaction.followUp.bind(interaction)
      : interaction.reply.bind(interaction);
    await replyFn({ content: 'An internal error occurred.', flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

client.once('clientReady', (c) => {
  console.log(`[bot] ready as ${c.user.tag}`);
});

await client.login(DISCORD_TOKEN);
