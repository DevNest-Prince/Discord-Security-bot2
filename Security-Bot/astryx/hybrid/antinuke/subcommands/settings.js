


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
const { AntinukeConfig, AntinukeWhitelist } = require('../../../../database/models');
const emojis = require('../../../emojis.json');

module.exports = {
    name: 'settings',
    description: 'View and edit current antinuke settings',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (guild.ownerId !== member.id) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Only the **Server Owner** can view antinuke settings.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });

        if (!config) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Antinuke Not Configured')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Run `/antinuke setup` to configure antinuke for this server.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const whitelistCount = await AntinukeWhitelist.count({ where: { guildId: guild.id } });

        const enabledModules = [];
        const disabledModules = [];

        const moduleNames = {
            antiBan: 'Anti-Ban',
            antiKick: 'Anti-Kick',
            antiBot: 'Anti-Bot',
            antiChannelCreate: 'Anti-Channel Create',
            antiChannelDelete: 'Anti-Channel Delete',
            antiChannelEdit: 'Anti-Channel Update',
            antiEveryoneMention: 'Anti-Everyone/Here',
            antiRoleCreate: 'Anti-Role Create',
            antiRoleDelete: 'Anti-Role Delete',
            antiRoleUpdate: 'Anti-Role Update',
            antiMemberUpdate: 'Anti-Member Update',
            antiGuildUpdate: 'Anti-Guild Update',
            antiIntegration: 'Anti-Integration',
            antiWebhookCreate: 'Anti-Webhook Create',
            antiWebhookDelete: 'Anti-Webhook Delete',
            antiWebhookUpdate: 'Anti-Webhook Update',
            antiPrune: 'Anti-Prune',
            antiEmoji: 'Anti-Emoji',
            autoRecovery: 'Auto Recovery (Undo Attacker Actions)'
        };

        for (const [key, name] of Object.entries(moduleNames)) {
            if (config[key]) {
                enabledModules.push(name);
            } else {
                disabledModules.push(name);
            }
        }

        const punishmentLabels = {
            stripall: 'Strip All Roles',
            kick: 'Kick User',
            ban: 'Ban User'
        };

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### Antinuke Settings\n**Status:** ${config.enabled ? `${emojis.online} Enabled` : `${emojis.offline} Disabled`}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Threshold:** ${config.threshold} actions in ${config.timeframe}s\n` +
                    `**Punishment:** ${punishmentLabels[config.punishment] || config.punishment}\n` +
                    `**Log Channel:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Not set'}\n` +
                    `**Whitelisted Users:** ${whitelistCount}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**Enabled Modules:**\n${enabledModules.length > 0 ? enabledModules.map(m => `${emojis.enabled} ${m}`).join('\n') : 'None'}`
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
                        .setCustomId('antinuke_toggle')
                        .setLabel(config.enabled ? 'Disable' : 'Enable')
                        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('antinuke_edit_modules')
                        .setLabel('Edit Modules')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('antinuke_edit_settings')
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
