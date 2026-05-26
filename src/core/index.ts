import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, MessageFlags, ApplicationCommandOptionType } from 'discord.js';
import { CommandRouter } from './router.js';
import { discoverAndRegister } from './registry.js';
import type { CommandContext } from '../types/index.js';
import { getLogger } from '@sriram/logger';

const logger = getLogger('discord-bot');

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
    logger.error({
      endpoint: '/startup/commands',
      method: 'DISCORD',
      status: 500,
      message: (err as Error).message ?? String(err),
      error_type: (err as Error).constructor?.name ?? 'Error',
      stack_trace: (err as Error).stack?.slice(0, 2000),
      duration_ms: 0,
    });
    process.exit(1);
  });
logger.request({ endpoint: '/startup/commands', method: 'DISCORD', status: 200, duration_ms: 0 });

// Boot Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('error', (err) => {
  logger.error({
    endpoint: '/client',
    method: 'DISCORD',
    status: 500,
    message: err.message,
    error_type: err.constructor?.name ?? 'Error',
    stack_trace: err.stack?.slice(0, 2000),
    duration_ms: 0,
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'This bot only works in servers.' });
    return;
  }

  const firstOpt = interaction.options.data[0];
  let args: Record<string, string>;
  if (firstOpt?.type === ApplicationCommandOptionType.Subcommand) {
    args = { subcommand: firstOpt.name };
    for (const opt of firstOpt.options ?? []) {
      args[opt.name] = String(opt.value ?? '');
    }
  } else {
    args = Object.fromEntries(
      interaction.options.data.map((opt) => [opt.name, String(opt.value ?? '')])
    );
  }

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
    const error = err as Error;
    logger.error({
      endpoint: `/command/${interaction.commandName}`,
      method: 'DISCORD',
      status: 500,
      message: error.message ?? String(err),
      error_type: error.constructor?.name ?? 'Error',
      stack_trace: error.stack?.slice(0, 2000),
      duration_ms: 0,
    });
    const replyFn = interaction.replied || interaction.deferred
      ? interaction.followUp.bind(interaction)
      : interaction.reply.bind(interaction);
    await replyFn({ content: 'An internal error occurred.', flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

client.once('clientReady', (_c) => {
  logger.request({ endpoint: '/startup/ready', method: 'DISCORD', status: 200, duration_ms: 0 });
});

await client.login(DISCORD_TOKEN);
