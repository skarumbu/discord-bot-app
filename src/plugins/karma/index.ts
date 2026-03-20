import { SlashCommandBuilder } from 'discord.js';
import { TableClient } from '@azure/data-tables';
import type { InProcessAdapter, CommandContext, PluginResponse } from '../../types/index.js';

interface KarmaEntity {
  partitionKey: string; // guildId
  rowKey: string;       // userId
  score: number;
}

const connectionString = process.env.KARMA_STORAGE_CONNECTION_STRING!;
const client = TableClient.fromConnectionString(connectionString, 'karma');
await client.createTable(); // no-op if already exists

async function getScore(guildId: string, userId: string): Promise<number> {
  try {
    const entity = await client.getEntity<KarmaEntity>(guildId, userId);
    return entity.score ?? 0;
  } catch {
    return 0; // entity not found = 0 karma
  }
}

async function setScore(guildId: string, userId: string, score: number): Promise<void> {
  await client.upsertEntity({ partitionKey: guildId, rowKey: userId, score }, 'Replace');
}

const karmaPlugin: InProcessAdapter = {
  commands: ['karma'],

  slashCommandDefinitions: [
    new SlashCommandBuilder()
      .setName('karma')
      .setDescription('Karma system')
      .addSubcommand((sub) =>
        sub
          .setName('give')
          .setDescription('Give karma to a user')
          .addUserOption((opt) =>
            opt.setName('user').setDescription('Who to give karma to').setRequired(true)
          )
          .addIntegerOption((opt) =>
            opt.setName('amount').setDescription('Amount (default 1)').setMinValue(1).setMaxValue(5)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('take')
          .setDescription('Subtract karma from a user')
          .addUserOption((opt) =>
            opt.setName('user').setDescription('Who to take karma from').setRequired(true)
          )
          .addIntegerOption((opt) =>
            opt.setName('amount').setDescription('Amount (default 1)').setMinValue(1).setMaxValue(5)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('show')
          .setDescription("Show a user's karma")
          .addUserOption((opt) =>
            opt.setName('user').setDescription('User to check (default: you)')
          )
      )
      .addSubcommand((sub) =>
        sub.setName('board').setDescription('Show the karma leaderboard')
      )
      .toJSON(),
  ],

  async execute(ctx: CommandContext): Promise<PluginResponse> {
    const { subcommand } = ctx.args;
    const { guildId, invokingUserId } = ctx.context;

    if (subcommand === 'give' || subcommand === 'take') {
      const targetId = ctx.args['user'];
      const amount = parseInt(ctx.args['amount'] ?? '1', 10);

      if (targetId === invokingUserId) {
        return { content: "You can't give karma to yourself.", ephemeral: true };
      }

      const current = await getScore(guildId, targetId);
      const delta = subcommand === 'give' ? amount : -amount;
      const next = current + delta;
      await setScore(guildId, targetId, next);

      const verb = subcommand === 'give' ? 'gave' : 'took';
      const prep = subcommand === 'give' ? 'to' : 'from';
      return { content: `${verb} ${amount} karma ${prep} <@${targetId}>. They now have **${next}** karma.` };
    }

    if (subcommand === 'show') {
      const targetId = ctx.args['user'] || invokingUserId;
      const score = await getScore(guildId, targetId);
      return { content: `<@${targetId}> has **${score}** karma.` };
    }

    if (subcommand === 'board') {
      const entities: KarmaEntity[] = [];
      for await (const entity of client.listEntities<KarmaEntity>({
        queryOptions: { filter: `PartitionKey eq '${guildId}'` },
      })) {
        entities.push(entity);
      }
      entities.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      const top = entities.slice(0, 10);
      if (top.length === 0) return { content: 'No karma recorded yet.' };
      const lines = top.map((e, i) => `${i + 1}. <@${e.rowKey}> — **${e.score}**`);
      return { content: `**Karma Leaderboard**\n${lines.join('\n')}` };
    }

    return { content: 'Unknown subcommand.', ephemeral: true };
  },
};

export default karmaPlugin;
