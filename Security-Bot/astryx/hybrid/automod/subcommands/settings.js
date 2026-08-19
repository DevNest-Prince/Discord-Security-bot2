


const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { AutomodConfig, AutomodWhitelist } = require('../../../../database/models');
const emojis = require('../../../emojis.json');

module.exports = {
    name: 'settings',
    description: 'View and edit current automod settings',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('You need **Manage Server** permission to view automod settings.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const config = await AutomodConfig.findOne({ where: { guildId: guild.id } });

        if (!config) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### AutoMod Not Configured')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Run `/automod setup` to configure automod for this server.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const whitelistCount = await AutomodWhitelist.count({ where: { guildId: guild.id } });

        const moduleNames = {
            antiSpam: 'Anti-Spam',
            antiLink: 'Anti-Link',
            antiInvite: 'Anti-Invite',
            antiBadWords: 'Anti-Bad Words',
            antiMassMention: 'Anti-Mass Mention',
            antiCaps: 'Anti-Caps'
        };

        const disabledModules = [];
        for (const [key, name] of Object.entries(moduleNames)) {
            if (!config[key]) {
                disabledModules.push(name);
            }
        }

        const punishmentLabels = {
            delete: 'Delete Message',
            warn: 'Warn User',
            mute: 'Mute User',
            kick: 'Kick User',
            ban: 'Ban User'
        };

        const badWords = config.getBadWords();


        let enabledModulesList = '';
        for (const [key, name] of Object.entries(moduleNames)) {
            if (config[key]) {
                const punishmentKey = key + 'Punishment';
                const punishment = punishmentLabels[config[punishmentKey]] || 'Delete Message';
                enabledModulesList += `${emojis.enabled} ${name} (${punishment})\n`;
            }
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### AutoMod Settings\n**Status:** ${config.enabled ? `${emojis.online} Enabled` : `${emojis.offline} Disabled`}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Log Channel:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Not set'}\n` +
                    `**Whitelisted:** ${whitelistCount} entries\n` +
                    `**Bad Words:** ${badWords.length} words`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Thresholds:**\n` +
                    `Spam: ${config.spamThreshold} msgs / ${config.spamInterval}s\n` +
                    `Mentions: ${config.mentionLimit} max\n` +
                    `Caps: ${config.capsPercentage}% max`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Active Protections:**\n${enabledModulesList || 'None'}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Disabled Modules:**\n${disabledModules.length > 0 ? disabledModules.map(m => `${emojis.disabled} ${m}`).join('\n') : 'None'}`
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('automod_toggle')
                        .setLabel(config.enabled ? 'Disable' : 'Enable')
                        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('automod_edit_modules')
                        .setLabel('Edit Modules')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('automod_edit_settings')
                        .setLabel('Edit Settings')
                        .setStyle(ButtonStyle.Secondary)
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
};
