
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
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const channel = interactionOrMessage.channel;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const isSlash = interactionOrMessage.isCommand?.();

        let targetUserId;
        if (isSlash) {
            const u = interactionOrMessage.options.getUser('user');
            targetUserId = u?.id;
        } else {
            if (!args[0]) return reply(interactionOrMessage, 'Please specify a staff member to transfer to.\n**Usage:** `ticket transfer <user>`');
            targetUserId = args[0].replace(/[<@!>]/g, '');
        }

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);

        if (!ticket) return reply(interactionOrMessage, 'This channel is not a valid ticket channel.');
        if (!config) return reply(interactionOrMessage, 'Ticket system is not configured.');

        const member = guild.members.cache.get(userId);
        if (!hasSupportRole(member, config)) {
            return reply(interactionOrMessage, 'Only support staff can transfer tickets.');
        }

        if (!ticket.claimedBy) return reply(interactionOrMessage, 'This ticket has not been claimed yet. Use `ticket claim` first.');
        if (ticket.claimedBy !== userId && !member.permissions.has('Administrator')) {
            return reply(interactionOrMessage, 'Only the current claimant or an administrator can transfer this ticket.');
        }

        if (targetUserId === ticket.claimedBy) return reply(interactionOrMessage, 'This ticket is already claimed by that user.');

        try {
            const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
            if (!targetMember) return reply(interactionOrMessage, 'The specified user could not be found in this server.');

            if (!hasSupportRole(targetMember, config)) {
                return reply(interactionOrMessage, 'The target user is not a support staff member.');
            }

            const previousClaimer = ticket.claimedBy;
            ticket.claimedBy = targetUserId;
            await ticket.save();

            logTicketEvent(guild, config, 'Ticket Transferred', `**Ticket:** ${channel}\n**From:** <@${previousClaimer}>\n**To:** <@${targetUserId}>\n**Transferred by:** <@${userId}>`).catch(() => {});

            return replyTitled(interactionOrMessage, '### Ticket Transferred', `This ticket has been transferred from <@${previousClaimer}> to <@${targetUserId}>.`);
        } catch (error) {
            console.error('Ticket transfer error:', error);
            return reply(interactionOrMessage, 'Failed to transfer the ticket. Please try again.');
        }
    }
};
