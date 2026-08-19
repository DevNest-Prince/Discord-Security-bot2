


const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('j2c')
        .setDescription('Join to Create voice channel management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup the Join to Create system')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('View the current J2C configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset the J2C configuration')
        ),

    name: 'j2c',
    aliases: ['join2create'],
    description: 'Join to Create voice channel management',
    category: 'general',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();

        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (!subcommand || !['setup', 'config', 'reset'].includes(subcommand)) {
            return require('../../utils/helpMenu').sendHelp('j2c', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
