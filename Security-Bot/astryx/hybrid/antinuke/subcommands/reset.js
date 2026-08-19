


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

module.exports = {
    name: 'reset',
    description: 'Reset antinuke to default settings',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (guild.ownerId !== member.id) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Only the **Server Owner** can reset antinuke.')
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
                    new TextDisplayBuilder().setContent('Antinuke has not been configured yet.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        await config.update({
            enabled: false,
            logChannelId: null,
            punishment: 'stripall',
            threshold: 3,
            timeframe: 60,
            antiBan: true,
            antiKick: true,
            antiBot: true,
            antiChannelCreate: true,
            antiChannelDelete: true,
            antiChannelEdit: false,
            antiEveryoneMention: false,
            antiRoleCreate: true,
            antiRoleDelete: true,
            antiRoleUpdate: true,
            antiMemberUpdate: false,
            antiGuildUpdate: false,
            antiIntegration: false,
            antiWebhookCreate: true,
            antiWebhookDelete: false,
            antiWebhookUpdate: false,
            antiPrune: false,
            antiEmoji: false,
            autoRecovery: false
        });

        await AntinukeWhitelist.destroy({ where: { guildId: guild.id } });

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# Antinuke Reset')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    'Antinuke has been reset to default settings and **disabled**.\n\n' +
                    'All whitelisted users have been removed.\n\n' +
                    'Use `/antinuke setup` to configure again.'
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
