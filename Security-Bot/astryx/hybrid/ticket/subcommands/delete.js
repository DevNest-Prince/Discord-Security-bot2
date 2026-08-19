
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
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const isSlash = interactionOrMessage.isCommand?.();

        let targetChannel = interactionOrMessage.channel;

        if (isSlash) {
            const ch = interactionOrMessage.options.getChannel('channel');
            if (ch) targetChannel = ch;
        } else if (args[0]) {
            const channelId = args[0].replace(/[<>#]/g, '');
            const found = guild.channels.cache.get(channelId);
            if (found) targetChannel = found;
            else return reply(interactionOrMessage, 'The specified channel could not be found.');
        }

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: targetChannel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);
        if (!ticket) return reply(interactionOrMessage, 'This channel is not a valid ticket channel.');
        if (!config) return reply(interactionOrMessage, 'Ticket system is not configured.');

        const member = guild.members.cache.get(userId);
        const hasPermission = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            hasSupportRole(member, config);

        if (!hasPermission) return reply(interactionOrMessage, 'Only support staff can delete tickets.');

        try {
            ticket.status = 'deleted';
            await ticket.save();

            logTicketEvent(guild, config, 'Ticket Deleted', `**Ticket:** ${targetChannel.name}\n**Deleted by:** <@${userId}>`).catch(() => {});

            if (targetChannel.id === interactionOrMessage.channel.id) {
                await replyTitled(interactionOrMessage, '### Ticket Deleted', 'This ticket channel will be deleted in 5 seconds...');
                setTimeout(async () => {
                    try { await targetChannel.delete(); } catch (e) { console.error('Failed to delete ticket channel:', e); }
                }, 5000);
            } else {
                await targetChannel.delete();
                return replyTitled(interactionOrMessage, '### Ticket Deleted', `Ticket channel **${targetChannel.name}** has been deleted.`);
            }
        } catch (error) {
            console.error('Ticket deletion error:', error);
            return reply(interactionOrMessage, 'Failed to delete the ticket channel.');
        }
    }
};
