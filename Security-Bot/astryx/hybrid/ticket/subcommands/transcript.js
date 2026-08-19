
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { TicketConfig, Ticket } = require('../../../../database/models');
const { generateAndSendTranscript, hasSupportRole } = require('../../../utils/ticketUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

function replyTitled(ctx, title, body) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

module.exports = {
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const channel = interactionOrMessage.channel;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);

        if (!ticket) return reply(interactionOrMessage, 'This channel is not a valid ticket channel.');
        if (!config) return reply(interactionOrMessage, 'Ticket system is not configured.');

        const member = guild.members.cache.get(userId);
        if (!hasSupportRole(member, config))
            return reply(interactionOrMessage, 'Only support staff can use this command.');

        try {
            await generateAndSendTranscript(guild, config, ticket, interactionOrMessage.client);
            return replyTitled(interactionOrMessage, '### Transcript Sent', 'The transcript has been sent to the ticket creator and log channel.');
        } catch (error) {
            console.error('Transcript command error:', error);
            return reply(interactionOrMessage, 'Failed to generate the transcript.');
        }
    }
};
