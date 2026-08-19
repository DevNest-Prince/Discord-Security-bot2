
const {
    PermissionsBitField, ChannelType,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, SectionBuilder, ThumbnailBuilder,
    MediaGalleryBuilder, MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');
const { TicketConfig, TicketCategory, Ticket } = require('../../../database/models');
const { logTicketEvent, generateAndSendTranscript, getSupportRoleIds, hasSupportRole } = require('../../utils/ticketUtils');

async function handle(interaction) {
    const id = interaction.customId;

    if (interaction.isStringSelectMenu() && id === 'create_ticket') {
        await handleTicketCreation(interaction);
        return true;
    }

    if (interaction.isButton()) {
        if (id === 'ticket_claim') { await handleTicketClaim(interaction); return true; }
        if (id === 'ticket_close') { await handleTicketClose(interaction); return true; }
        if (id === 'ticket_reopen') { await handleTicketReopen(interaction); return true; }
        if (id === 'ticket_delete') { await handleTicketDelete(interaction); return true; }
    }

    return false;
}

async function handleTicketCreation(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const user = interaction.user;
    const categoryName = interaction.values[0];

    const [config, userTickets] = await Promise.all([
        TicketConfig.findOne({ where: { guildId: guild.id } }),
        Ticket.findAll({ where: { guildId: guild.id, userId: user.id, status: ['open', 'claimed'] } })
    ]);

    if (!config) return interaction.editReply({ content: 'Ticket system is not configured.' });
    if (userTickets.length >= 3) return interaction.editReply({ content: 'You have 3 open tickets already. Close some first.' });

    try {
        const selectedCategory = await TicketCategory.findOne({ where: { guildId: guild.id, categoryName } });

        let parentId = config.defaultCategoryId;
        if (config.setupType === 'multiple' && selectedCategory?.categoryId) {
            parentId = selectedCategory.categoryId;
        }

        const sanitizedUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
        const sanitizedCategoryName = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const channelName = `${sanitizedUsername}-${sanitizedCategoryName}`.substring(0, 100);

        const allRoleIds = getSupportRoleIds(config);
        const permissionOverwrites = [
            { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages] }
        ];

        for (const roleId of allRoleIds) {
            permissionOverwrites.push({
                id: roleId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages]
            });
        }

        const ticketChannel = await guild.channels.create({
            name: channelName || `ticket-${user.id}`,
            type: ChannelType.GuildText,
            parent: parentId,
            permissionOverwrites
        });

        const ticket = await Ticket.create({ guildId: guild.id, channelId: ticketChannel.id, userId: user.id, categoryName });

        const rolePings = allRoleIds.map(id => `<@&${id}>`).join(' ');
        await ticketChannel.send({ content: rolePings, allowedMentions: { roles: allRoleIds } });

        const titleSuffix = categoryName.toLowerCase().includes('ticket') ? '' : ' Ticket';
        const ticketContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${categoryName}${titleSuffix}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Welcome** <@${user.id}>\n**Category:** ${categoryName}\n\nOur support team will assist you shortly.`)
                    )
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL({ dynamic: true })))
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL('https://i.ibb.co/BVsB4CS4/382ad2dd02dd701a813c189ec01be1d3.jpg')
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Ticket').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
            ));

        const ticketMsg = await ticketChannel.send({ components: [ticketContainer], flags: MessageFlags.IsComponentsV2 });

        await interaction.editReply({ content: `Ticket created in ${ticketChannel}` });

        ticketMsg.pin().catch(() => {});
        logTicketEvent(guild, config, 'Ticket Created', `**User:** <@${user.id}>\n**Category:** ${categoryName}\n**Channel:** ${ticketChannel}\n**Ticket ID:** ${ticket.id}`).catch(() => {});
    } catch (error) {
        console.error('Ticket creation error:', error);
        await interaction.editReply({ content: 'Failed to create ticket. Contact an administrator.' });
    }
}

async function handleTicketClaim(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferUpdate();

    const guild = interaction.guild;
    const user = interaction.user;
    const channel = interaction.channel;

    const [ticket, config] = await Promise.all([
        Ticket.findOne({ where: { channelId: channel.id } }),
        TicketConfig.findOne({ where: { guildId: guild.id } })
    ]);

    if (!ticket || !config) return;

    const member = guild.members.cache.get(user.id);
    if (ticket.userId !== user.id && !hasSupportRole(member, config)) return;
    if (ticket.status === 'deleted' || ticket.status === 'closed') return;
    if (ticket.claimedBy) return;

    ticket.claimedBy = user.id;
    ticket.status = 'claimed';
    await ticket.save();

    const claimContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Ticket Claimed'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Claimed by <@${user.id}>`));
    await channel.send({ components: [claimContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

    logTicketEvent(guild, config, 'Ticket Claimed', `**Ticket:** ${channel}\n**Claimed by:** <@${user.id}>`).catch(() => {});
}

async function handleTicketClose(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferUpdate();

    const guild = interaction.guild;
    const user = interaction.user;
    const channel = interaction.channel;

    const [ticket, config] = await Promise.all([
        Ticket.findOne({ where: { channelId: channel.id } }),
        TicketConfig.findOne({ where: { guildId: guild.id } })
    ]);

    if (!ticket || !config) return;

    const member = guild.members.cache.get(user.id);
    if (ticket.userId !== user.id && !hasSupportRole(member, config)) return;

    ticket.status = 'closed';
    ticket.closedAt = new Date();
    await ticket.save();

    await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false });

    generateAndSendTranscript(guild, config, ticket, interaction.client).catch(() => {});

    const closedContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Ticket Closed'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
        ));

    await channel.send({ components: [closedContainer], flags: MessageFlags.IsComponentsV2 });

    logTicketEvent(guild, config, 'Ticket Closed', `**Ticket:** ${channel}\n**Closed by:** <@${user.id}>`).catch(() => {});
}

async function handleTicketReopen(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferUpdate();

    const guild = interaction.guild;
    const user = interaction.user;
    const channel = interaction.channel;

    const [ticket, config] = await Promise.all([
        Ticket.findOne({ where: { channelId: channel.id } }),
        TicketConfig.findOne({ where: { guildId: guild.id } })
    ]);

    if (!ticket || !config) return;

    const member = guild.members.cache.get(user.id);
    if (!hasSupportRole(member, config)) return;

    const newStatus = ticket.claimedBy ? 'claimed' : 'open';
    ticket.status = newStatus;
    ticket.closedAt = null;
    await ticket.save();

    await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: true });

    const reopenContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Ticket Reopened'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Reopened by <@${user.id}>`));
    await channel.send({ components: [reopenContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

    logTicketEvent(guild, config, 'Ticket Reopened', `**Ticket:** ${channel}\n**Reopened by:** <@${user.id}>`).catch(() => {});
}

async function handleTicketDelete(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferUpdate();

    const guild = interaction.guild;
    const user = interaction.user;
    const channel = interaction.channel;

    const [ticket, config] = await Promise.all([
        Ticket.findOne({ where: { channelId: channel.id } }),
        TicketConfig.findOne({ where: { guildId: guild.id } })
    ]);

    if (!ticket || !config) return;

    const member = guild.members.cache.get(user.id);
    const hasPermission = member.permissions.has(PermissionsBitField.Flags.Administrator) || hasSupportRole(member, config);
    if (!hasPermission) return;

    ticket.status = 'deleted';
    await ticket.save();

    logTicketEvent(guild, config, 'Ticket Deleted', `**Ticket:** ${channel.name}\n**Deleted by:** <@${user.id}>`).catch(() => {});

    const deleteContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Ticket Deleted'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('This channel will be deleted in 5 seconds...'));
    await channel.send({ components: [deleteContainer], flags: MessageFlags.IsComponentsV2 });

    setTimeout(async () => {
        try { await channel.delete(); } catch (e) { console.error('Failed to delete ticket channel:', e); }
    }, 5000);
}

module.exports = { handle };
