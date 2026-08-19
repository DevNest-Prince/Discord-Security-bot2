
const {
    PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags
} = require('discord.js');
const { TicketConfig, TicketCategory } = require('../../../../database/models');
const { logTicketEvent } = require('../../../utils/ticketUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

module.exports = {
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const member = guild.members.cache.get(userId);

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return reply(interactionOrMessage, 'You need **Administrator** permission to use this command.');
        }

        const config = await TicketConfig.findOne({ where: { guildId: guild.id } });
        if (!config) return reply(interactionOrMessage, 'Ticket system is not configured. Nothing to reset.');

        const confirmContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Reset Ticket System'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> This will delete all ticket configuration, categories, and support role assignments for this server.\n> **Warning:** Existing ticket channels will not be deleted, but the system will stop functioning until you run setup again.'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_reset_confirm').setLabel('Reset').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('ticket_reset_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            ));

        const isSlash = interactionOrMessage.isCommand?.();
        let msg;
        if (isSlash) {
            msg = await interactionOrMessage.reply({ components: [confirmContainer], flags: MessageFlags.IsComponentsV2, fetchReply: true });
        } else {
            msg = await interactionOrMessage.reply({ components: [confirmContainer], flags: MessageFlags.IsComponentsV2 });
        }

        if (!msg) msg = await interactionOrMessage.fetchReply?.();

        const filter = i => i.user.id === userId && i.message.id === msg.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'ticket_reset_cancel') {
                const cancelContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Reset Cancelled'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('The reset has been cancelled.'));
                await interaction.update({ components: [cancelContainer] });
                collector.stop();
                return;
            }

            if (interaction.customId === 'ticket_reset_confirm') {
                try {
                    const user = interactionOrMessage.user || interactionOrMessage.author;
                    await logTicketEvent(guild, config, 'Ticket System Reset', `**Reset by:** <@${userId}>`);

                    await TicketCategory.destroy({ where: { guildId: guild.id } });
                    await TicketConfig.destroy({ where: { guildId: guild.id } });

                    const doneContainer = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Ticket System Reset'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('All ticket configuration has been removed. You can now run `ticket setup` to configure the system again.'));
                    await interaction.update({ components: [doneContainer] });
                } catch (error) {
                    console.error('Ticket reset error:', error);
                    const errContainer = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Failed to reset the ticket system. Please try again.'));
                    await interaction.update({ components: [errContainer] });
                }
                collector.stop();
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Reset Timeout'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Reset cancelled due to inactivity.'));
                msg.edit({ components: [timeoutContainer] }).catch(() => {});
            }
        });
    }
};
