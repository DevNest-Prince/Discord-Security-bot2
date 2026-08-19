
const { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
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
            if (!args[0]) return reply(interactionOrMessage, 'Please specify a user to remove.\n**Usage:** `ticket remove <user>`');
            targetUserId = args[0].replace(/[<@!>]/g, '');
        }

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);

        if (!ticket) return reply(interactionOrMessage, 'This channel is not a valid ticket channel.');
        if (!config) return reply(interactionOrMessage, 'Ticket system is not configured.');

        const member = guild.members.cache.get(userId);
        const canManage = ticket.userId === userId || ticket.claimedBy === userId || hasSupportRole(member, config);
        if (!canManage) return reply(interactionOrMessage, 'You don\'t have permission to remove users from this ticket.');

        if (targetUserId === ticket.userId) return reply(interactionOrMessage, 'You cannot remove the ticket creator.');

        try {
            const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
            if (!targetMember) return reply(interactionOrMessage, 'The specified user could not be found in this server.');

            const existingPerms = channel.permissionsFor(targetMember);
            if (!existingPerms?.has(PermissionsBitField.Flags.ViewChannel)) {
                return reply(interactionOrMessage, `${targetMember.user.tag} does not have access to this ticket.`);
            }

            await channel.permissionOverwrites.delete(targetMember.id);

            logTicketEvent(guild, config, 'User Removed from Ticket', `**Ticket:** ${channel}\n**Removed User:** <@${targetMember.id}>\n**Removed by:** <@${userId}>`).catch(() => {});

            return replyTitled(interactionOrMessage, '### User Removed', `<@${targetMember.id}> has been removed from this ticket.`);
        } catch (error) {
            console.error('Ticket remove user error:', error);
            return reply(interactionOrMessage, 'Failed to remove the user. Please check permissions and try again.');
        }
    }
};
