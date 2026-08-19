
const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antiraid')
        .setDescription('Anti-raid and verification protection')
        .addSubcommand(sub => sub.setName('setup').setDescription('Setup anti-raid protection')
            .addChannelOption(o => o.setName('alert').setDescription('Channel to alert staff on a raid').setRequired(true))
            .addIntegerOption(o => o.setName('threshold').setDescription('Joins before raid triggers (default 8)'))
            .addIntegerOption(o => o.setName('window').setDescription('Detection window in seconds (default 10)')))
        .addSubcommand(sub => sub.setName('enable').setDescription('Enable anti-raid'))
        .addSubcommand(sub => sub.setName('disable').setDescription('Disable anti-raid'))
        .addSubcommand(sub => sub.setName('settings').setDescription('Show current anti-raid settings'))
        .addSubcommand(sub => sub.setName('lockdown').setDescription('Manually lock down the server'))
        .addSubcommand(sub => sub.setName('unlock').setDescription('Lift the server lockdown'))
        .addSubcommand(sub => sub.setName('antialt').setDescription('Set minimum account age to join (anti-alt)')
            .addIntegerOption(o => o.setName('days').setDescription('Minimum account age in days (0 = off)').setRequired(true)))
        .addSubcommand(sub => sub.setName('verifysetup').setDescription('Setup button verification')
            .addRoleOption(o => o.setName('verified_role').setDescription('Role granted after verifying').setRequired(true))
            .addChannelOption(o => o.setName('channel').setDescription('Channel to post the verify panel').setRequired(true))
            .addRoleOption(o => o.setName('unverified_role').setDescription('Role applied on join until verified (optional)'))),

    name: 'antiraid',
    aliases: ['raid', 'antiraids'],
    category: 'moderation',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        const aliasMap = { on: 'enable', off: 'disable', config: 'settings', lock: 'lockdown', unlockdown: 'unlock', alt: 'antialt', verify: 'verifysetup', 'verify-setup': 'verifysetup' };
        const resolved = aliasMap[subcommand] || subcommand;

        const validSubs = ['setup', 'enable', 'disable', 'settings', 'lockdown', 'unlock', 'antialt', 'verifysetup'];
        if (!resolved || !validSubs.includes(resolved)) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Anti-Raid & Verification'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '`setup <alert> [threshold] [window]` - Setup anti-raid\n' +
                    '`enable` / `disable` - Toggle anti-raid\n' +
                    '`settings` - Show current settings\n' +
                    '`lockdown` / `unlock` - Manual server lockdown\n' +
                    '`antialt <days>` - Min account age to join (0 = off)\n' +
                    '`verifysetup <role> <channel> [unverified_role]` - Button verification'
                ));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const subcommandFile = require(`./subcommands/${resolved}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
