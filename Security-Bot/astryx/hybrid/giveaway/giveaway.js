


const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('Duration (e.g., 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('winners')
            .setDescription('Number of winners')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option
            .setName('prize')
            .setDescription('The prize for the giveaway')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('The giveaway message ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reroll')
        .setDescription('Reroll a giveaway')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('The giveaway message ID')
            .setRequired(true)
        )
    ),

  name: 'giveaway',
  aliases: ['gstart', 'gend', 'greroll', 'giveaway-start', 'giveaway-end', 'giveaway-reroll'],
  description: 'Manage giveaways',
  category: 'giveaway',

  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();

    let subcommand;

    if (isSlash) {
      subcommand = interactionOrMessage.options.getSubcommand();
    } else {
      if (['start', 'end', 'reroll'].includes(args[0]?.toLowerCase())) {
        subcommand = args[0].toLowerCase();
        args = args.slice(1);
      } else {
        const lowerContent = interactionOrMessage.content.toLowerCase();
        if (lowerContent.match(/\bgstart\b/)) {
          subcommand = 'start';
        } else if (lowerContent.match(/\bgend\b/)) {
          subcommand = 'end';
        } else if (lowerContent.match(/\bgreroll\b/)) {
          subcommand = 'reroll';
        } else {
          subcommand = null;
        }
      }
    }

    if (!subcommand || !['start', 'end', 'reroll'].includes(subcommand)) {
      return require('../../utils/helpMenu').sendHelp('giveaway', interactionOrMessage);
    }

    const subcommandFile = require(`./subcommands/${subcommand}`);
    return subcommandFile.execute(interactionOrMessage, args);
  }
};
