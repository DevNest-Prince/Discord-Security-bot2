
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { RaidConfig } = require('../../../../database/models');
const { isStaff } = require('../../../utils/raidUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
    name: 'verifysetup',
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const isSlash = interactionOrMessage.isCommand?.();
        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Server** permission to do that.');

        let verifiedRole, channel, unverifiedRole;
        if (isSlash) {
            verifiedRole = interactionOrMessage.options.getRole('verified_role');
            channel = interactionOrMessage.options.getChannel('channel');
            unverifiedRole = interactionOrMessage.options.getRole('unverified_role');
        } else {
            verifiedRole = interactionOrMessage.mentions.roles.first();
            channel = interactionOrMessage.mentions.channels.first();
            unverifiedRole = interactionOrMessage.mentions.roles.at(1);
        }

        if (!verifiedRole || !channel) return reply(interactionOrMessage, 'Provide a verified role and a channel. Example: `/antiraid verifysetup verified_role:@Member channel:#verify`');

        const me = guild.members.me;
        if (me && verifiedRole.position >= me.roles.highest.position) {
            return reply(interactionOrMessage, 'My highest role must be **above** the verified role so I can assign it. Move my role up.');
        }

        const [config] = await RaidConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });

        const panel = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Verification'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Click the button below to verify yourself and gain access to the server.'))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('raid_verify').setLabel('Verify').setStyle(ButtonStyle.Success).setEmoji('✅')
            ));

        let panelMsg;
        try {
            panelMsg = await channel.send({ components: [panel], flags: MessageFlags.IsComponentsV2 });
        } catch {
            return reply(interactionOrMessage, `I couldn't send a message in ${channel}. Check my permissions there.`);
        }

        config.verifyEnabled = true;
        config.verifyRoleId = verifiedRole.id;
        config.verifyChannelId = channel.id;
        config.unverifiedRoleId = unverifiedRole ? unverifiedRole.id : null;
        config.verifyPanelMessageId = panelMsg.id;
        await config.save();

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Verification Setup Complete'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `**Verified Role:** <@&${verifiedRole.id}>\n` +
                `**Panel Channel:** <#${channel.id}>\n` +
                `**Unverified Role:** ${unverifiedRole ? `<@&${unverifiedRole.id}> (applied on join)` : 'None'}`
            ));
        return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
    }
};
