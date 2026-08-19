
const {
    PermissionsBitField, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags
} = require('discord.js');
const { TicketConfig, TicketCategory } = require('../../../../database/models');
const { logTicketEvent, getSupportRoleIds, refreshPanel } = require('../../../utils/ticketUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

function buildModal() {
    const modal = new ModalBuilder().setCustomId('ticket_addcategory_modal').setTitle('Add Ticket Category');
    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('category_name').setLabel('Category Name').setStyle(TextInputStyle.Short).setPlaceholder('e.g., Bug Reports').setMaxLength(50).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('category_emoji').setLabel('Category Emoji (optional)').setStyle(TextInputStyle.Short).setPlaceholder('e.g., Bug').setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('category_description').setLabel('Category Description (optional)').setStyle(TextInputStyle.Paragraph).setPlaceholder('Brief description...').setMaxLength(200).setRequired(false))
    );
    return modal;
}

async function handleModalSubmit(m, guild, config, userId, editMsg) {
    await m.deferUpdate().catch(() => {});

    const name = m.fields.getTextInputValue('category_name');
    const emoji = m.fields.getTextInputValue('category_emoji') || null;
    const desc = m.fields.getTextInputValue('category_description') || null;

    const existing = await TicketCategory.findOne({ where: { guildId: guild.id, categoryName: name } });
    if (existing) {
        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('A category with this name already exists.'));
        if (editMsg) return editMsg.edit({ components: [container] }).catch(() => {});
        return m.followUp({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
    }

    let categoryId = null;
    if (config.setupType === 'multiple') {
        try {
            const catOverwrites = [{ id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] }];
            for (const rid of getSupportRoleIds(config)) {
                catOverwrites.push({ id: rid, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
            }
            const discordCat = await guild.channels.create({
                name: name.toUpperCase().replace(/\s+/g, '-'),
                type: ChannelType.GuildCategory,
                permissionOverwrites: catOverwrites
            });
            categoryId = discordCat.id;
        } catch (e) { console.error('Failed to create Discord category:', e); }
    }

    await TicketCategory.create({ guildId: guild.id, categoryName: name, categoryId, emoji, description: desc });
    await logTicketEvent(guild, config, 'Category Added', `**Category:** ${name}\n**Added by:** <@${userId}>`);
    refreshPanel(guild, config).catch(() => {});

    const doneContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Category Added'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> **${name}** has been added to the ticket system.`));
    if (editMsg) return editMsg.edit({ components: [doneContainer] }).catch(() => {});
    return m.followUp({ components: [doneContainer], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

module.exports = {
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const member = guild.members.cache.get(userId);
        const isSlash = interactionOrMessage.isCommand?.();

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return reply(interactionOrMessage, 'You need **Administrator** permission to use this command.');
        }

        const config = await TicketConfig.findOne({ where: { guildId: guild.id } });
        if (!config) return reply(interactionOrMessage, 'Ticket system is not configured. Use `ticket setup` first.');

        if (isSlash) {
            await interactionOrMessage.showModal(buildModal());
            try {
                const m = await interactionOrMessage.awaitModalSubmit({ time: 300000 });
                await handleModalSubmit(m, guild, config, userId);
            } catch {}
            return;
        }

        const btnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Add Category'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Click below to add a new ticket category.'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_addcat_btn').setLabel('Add Category').setStyle(ButtonStyle.Primary)
            ));

        const msg = await interactionOrMessage.reply({ components: [btnContainer], flags: MessageFlags.IsComponentsV2 });
        const sentMsg = msg || await interactionOrMessage.channel.messages.fetch({ limit: 1 }).then(m => m.first());

        try {
            const btnInteraction = await sentMsg.awaitMessageComponent({
                filter: i => i.customId === 'ticket_addcat_btn' && i.user.id === userId,
                time: 60000
            });

            await btnInteraction.showModal(buildModal());

            const m = await btnInteraction.awaitModalSubmit({ time: 300000 });
            await handleModalSubmit(m, guild, config, userId, sentMsg);
        } catch {
            const expiredContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Add Category'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Timed out.'));
            await sentMsg.edit({ components: [expiredContainer] }).catch(() => {});
        }
    }
};
