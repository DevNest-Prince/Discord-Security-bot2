
const {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags
} = require('discord.js');
const { TicketConfig, Ticket } = require('../../../../database/models');
const { logTicketEvent, generateAndSendTranscript, hasSupportRole } = require('../../../utils/ticketUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
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

        if (ticket.status === 'closed') return reply(interactionOrMessage, 'This ticket is already closed.');

        const member = guild.members.cache.get(userId);
        if (ticket.userId !== userId && !hasSupportRole(member, config)) {
            return reply(interactionOrMessage, 'You don\'t have permission to close this ticket.');
        }

        try {
            const isSlash = interactionOrMessage.isCommand?.();
            const reason = isSlash
                ? (interactionOrMessage.options.getString('reason') || 'No reason provided')
                : (args.join(' ') || 'No reason provided');

            ticket.status = 'closed';
            ticket.closedAt = new Date();
            await ticket.save();

            await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false });

            generateAndSendTranscript(guild, config, ticket, interactionOrMessage.client).catch(() => {});

            const closedContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Ticket Closed'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addActionRowComponents(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
                ));

            const sendOpts = { components: [closedContainer], flags: MessageFlags.IsComponentsV2 };
            if (interactionOrMessage.deferred) await interactionOrMessage.editReply(sendOpts);
            else await interactionOrMessage.reply(sendOpts);

            logTicketEvent(guild, config, 'Ticket Closed', `**Ticket:** ${channel}\n**Closed by:** <@${userId}>\n**Reason:** ${reason}`).catch(() => {});
        } catch (error) {
            console.error('Ticket close error:', error);
            return reply(interactionOrMessage, 'Failed to close the ticket. Please try again.');
        }
    }
};
