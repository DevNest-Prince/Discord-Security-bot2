


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

module.exports = {
    name: 'reset',
    description: 'Reset automod to default settings',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('You need **Manage Server** permission to reset automod.')
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
                    new TextDisplayBuilder().setContent('AutoMod has not been configured yet.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        await config.update({
            enabled: false,
            logChannelId: null,
            antiSpam: false,
            antiLink: false,
            antiInvite: false,
            antiBadWords: false,
            antiMassMention: false,
            antiCaps: false,
            antiPing: false,
            antiSpamPunishment: 'delete',
            antiLinkPunishment: 'delete',
            antiInvitePunishment: 'delete',
            antiBadWordsPunishment: 'delete',
            antiMassMentionPunishment: 'delete',
            antiCapsPunishment: 'delete',
            antiPingPunishment: 'delete'
        });

        await AutomodWhitelist.destroy({ where: { guildId: guild.id } });

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# AutoMod Reset')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    'AutoMod has been reset to default settings and **disabled**.\n\n' +
                    'All whitelist entries have been removed.\n\n' +
                    'Use `/automod setup` to configure again.'
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
