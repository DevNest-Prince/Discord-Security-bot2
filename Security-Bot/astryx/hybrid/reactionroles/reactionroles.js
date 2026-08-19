


const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'reactionroles',
  aliases: ['rr'],
  data: new SlashCommandBuilder()
    .setName('reactionroles')
    .setDescription('Setup and manage reaction roles for your server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Start the reaction roles setup wizard')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove an existing reaction roles message')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('The message ID of the reaction roles message')
            .setRequired(true)
        )
    ),

  async execute(interactionOrMessage, args) {
    const isSlash = typeof interactionOrMessage.isCommand === 'function' && interactionOrMessage.isCommand();

    if (isSlash) {
      const subcommand = interactionOrMessage.options.getSubcommand();

      if (subcommand === 'setup') {
        const setupModule = require('./subcommands/setup');
        return setupModule.execute(interactionOrMessage);
      } else if (subcommand === 'remove') {
        const messageId = interactionOrMessage.options.getString('message_id');
        return this._remove(interactionOrMessage, messageId);
      }
    } else {
      if (!args || !args.length) {
        return require('../../utils/helpMenu').sendHelp('reactionroles', interactionOrMessage);
      }
      const sub = args[0].toLowerCase();
      if (sub === 'setup') {
        const setupModule = require('./subcommands/setup');
        return setupModule.execute(interactionOrMessage);
      } else if (sub === 'remove') {
        const messageId = args[1];
        if (!messageId) {
          return interactionOrMessage.reply('Please provide a message ID. Usage: `.rr remove <message_id>`');
        }
        return this._remove(interactionOrMessage, messageId);
      } else {
        return require('../../utils/helpMenu').sendHelp('reactionroles', interactionOrMessage);
      }
    }
  },

  async _remove(ctx, messageId) {
    const ReactionRoles = require('../../../database/models/ReactionRoles');
    const isSlash = typeof ctx.isCommand === 'function' && ctx.isCommand();

    const config = await ReactionRoles.findOne({
      where: { messageId, guildId: ctx.guild.id }
    });

    if (!config) {
      return ctx.reply({
        content: 'Reaction roles message not found!',
        flags: isSlash ? MessageFlags.Ephemeral : undefined
      });
    }

    try {
      const channel = ctx.guild.channels.cache.get(config.channelId);
      if (channel) {
        await channel.messages.delete(messageId);
      }
    } catch (error) {
      console.error('Error deleting reaction roles message:', error);
    }

    await ReactionRoles.destroy({
      where: { messageId, guildId: ctx.guild.id }
    });

    return ctx.reply({
      content: '✅ Reaction roles message removed!',
      flags: isSlash ? MessageFlags.Ephemeral : undefined
    });
  }
};
