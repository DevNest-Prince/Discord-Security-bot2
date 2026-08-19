


const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antinuke')
        .setDescription('Protect your server from nuking attacks')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup antinuke with interactive wizard')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('View and edit current antinuke settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable the antinuke system')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable the antinuke system')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Manage whitelisted users')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(false)
                        .addChoices(
                            { name: 'add', value: 'add' },
                            { name: 'remove', value: 'remove' },
                            { name: 'list', value: 'list' }
                        )
                )
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to whitelist/unwhitelist')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset antinuke to default settings and disable it')
        ),

    name: 'antinuke',
    aliases: ['an', 'nuke'],
    description: 'Protect your server from nuking attacks',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (!subcommand || !['setup', 'settings', 'enable', 'disable', 'whitelist', 'reset'].includes(subcommand)) {
            return require('../../utils/helpMenu').sendHelp('antinuke', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
