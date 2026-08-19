
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { TicketConfig, Ticket } = require('../../../../database/models');
const { logTicketEvent, hasSupportRole } = require('../../../utils/ticketUtils');

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
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const channel = interactionOrMessage.channel;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);
        if (!ticket) return reply(interactionOrMessage, 'This channel is not a valid ticket channel.');
        if (!config) return reply(interactionOrMessage, 'Ticket system is not configured.');

        if (ticket.status !== 'closed') return reply(interactionOrMessage, `This ticket is already ${ticket.status}.`);

        const member = guild.members.cache.get(userId);
        if (!hasSupportRole(member, config)) {
            return reply(interactionOrMessage, 'Only support staff can reopen tickets.');
        }

        try {
            const newStatus = ticket.claimedBy ? 'claimed' : 'open';
            ticket.status = newStatus;
            ticket.closedAt = null;
            await ticket.save();

            await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: true });

            const statusText = newStatus === 'claimed' ? `Claimed by <@${ticket.claimedBy}>` : 'Open';
            return replyTitled(interactionOrMessage, '### Ticket Reopened', `This ticket has been reopened by <@${userId}>.\n<@${ticket.userId}> You can now continue the conversation.\n**Status:** ${statusText}`);
        } catch (error) {
            console.error('Ticket reopen error:', error);
            return reply(interactionOrMessage, 'Failed to reopen the ticket. Please try again.');
        }
    }
};
