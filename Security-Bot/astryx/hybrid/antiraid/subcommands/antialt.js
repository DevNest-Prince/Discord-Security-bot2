
const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { RaidConfig } = require('../../../../database/models');
const { isStaff } = require('../../../utils/raidUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
    name: 'antialt',
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const isSlash = interactionOrMessage.isCommand?.();
        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Server** permission to do that.');

        let days;
        if (isSlash) days = interactionOrMessage.options.getInteger('days');
        else days = parseInt(args[0], 10);

        if (days === null || days === undefined || Number.isNaN(days) || days < 0) {
            return reply(interactionOrMessage, 'Please provide a valid number of days (0 to turn off). Example: `antiraid antialt 7`');
        }

        const [config] = await RaidConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });
        config.minAccountAgeDays = days;
        await config.save();

        if (days === 0) return reply(interactionOrMessage, 'Anti-alt (account age filter) has been **turned off**.');
        return reply(interactionOrMessage, `Anti-alt enabled. Accounts younger than **${days} day(s)** will be kicked on join.`);
    }
};
