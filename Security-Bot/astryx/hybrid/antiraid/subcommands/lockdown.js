
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { RaidConfig } = require('../../../../database/models');
const { isStaff, applyLockdown, logRaidEvent } = require('../../../utils/raidUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
    name: 'lockdown',
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Server** permission to do that.');

        const [config] = await RaidConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });
        if (config.lockdownActive) return reply(interactionOrMessage, 'The server is already in **lockdown**.');

        await reply(interactionOrMessage, 'Applying lockdown...');
        const locked = await applyLockdown(guild);
        config.lockdownActive = true;
        await config.save();

        logRaidEvent(guild, config, 'Manual Lockdown', `**By:** <@${userId}>\n**Channels locked:** ${locked}`).catch(() => {});

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Server Locked Down'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Locked **${locked}** channels. Use \`antiraid unlock\` to lift it.`));
        try {
            if (interactionOrMessage.deferred || interactionOrMessage.replied) await interactionOrMessage.followUp({ components: [container], flags: MessageFlags.IsComponentsV2 });
            else await interactionOrMessage.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch { }
    }
};
