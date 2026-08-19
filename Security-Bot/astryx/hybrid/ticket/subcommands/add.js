
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
            if (!args[0]) return reply(interactionOrMessage, 'Please specify a user to add.\n**Usage:** `ticket add <user>`');
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
        if (!canManage) return reply(interactionOrMessage, 'You don\'t have permission to add users to this ticket.');

        try {
            const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
            if (!targetMember) return reply(interactionOrMessage, 'The specified user could not be found in this server.');

            const existingPerms = channel.permissionsFor(targetMember);
            if (existingPerms?.has(PermissionsBitField.Flags.ViewChannel)) {
                return reply(interactionOrMessage, `${targetMember.user.tag} already has access to this ticket.`);
            }

            await channel.permissionOverwrites.edit(targetMember.id, {
                ViewChannel: true, SendMessages: true, ReadMessageHistory: true
            });

            logTicketEvent(guild, config, 'User Added to Ticket', `**Ticket:** ${channel}\n**Added User:** <@${targetMember.id}>\n**Added by:** <@${userId}>`).catch(() => {});

            return replyTitled(interactionOrMessage, '### User Added', `${targetMember.user} has been added to this ticket by <@${userId}>.`);
        } catch (error) {
            console.error('Ticket add user error:', error);
            return reply(interactionOrMessage, 'Failed to add the user. Please check permissions and try again.');
        }
    }
};
