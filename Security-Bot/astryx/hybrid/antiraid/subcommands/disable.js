
const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { RaidConfig } = require('../../../../database/models');
const { isStaff } = require('../../../utils/raidUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
    name: 'disable',
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Server** permission to do that.');

        const config = await RaidConfig.findOne({ where: { guildId: guild.id } });
        if (!config || !config.enabled) return reply(interactionOrMessage, 'Anti-raid is already **disabled**.');

        config.enabled = false;
        await config.save();
        return reply(interactionOrMessage, 'Anti-raid has been **disabled**.');
    }
};
