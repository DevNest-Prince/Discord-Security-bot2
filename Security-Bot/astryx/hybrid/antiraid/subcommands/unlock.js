
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { RaidConfig } = require('../../../../database/models');
const { isStaff, removeLockdown, logRaidEvent } = require('../../../utils/raidUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
    name: 'unlock',
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Server** permission to do that.');

        const config = await RaidConfig.findOne({ where: { guildId: guild.id } });
        if (!config || !config.lockdownActive) return reply(interactionOrMessage, 'The server is not in lockdown.');

        await reply(interactionOrMessage, 'Lifting lockdown...');
        const unlocked = await removeLockdown(guild);
        config.lockdownActive = false;
        await config.save();

        logRaidEvent(guild, config, 'Lockdown Lifted', `**By:** <@${userId}>\n**Channels unlocked:** ${unlocked}`).catch(() => {});

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Lockdown Lifted'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Unlocked **${unlocked}** channels.`));
        try {
            if (interactionOrMessage.deferred || interactionOrMessage.replied) await interactionOrMessage.followUp({ components: [container], flags: MessageFlags.IsComponentsV2 });
            else await interactionOrMessage.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch { }
    }
};
