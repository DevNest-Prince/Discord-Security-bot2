
const {
    PermissionsBitField, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    SectionBuilder, ThumbnailBuilder, MessageFlags,
    MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const { TicketConfig, TicketCategory } = require('../../../../database/models');

function reply(ctx, text) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

function createValidLabel(name, prefix = '') {
    let cleanName = (name || 'item').toString().replace(/[^\w\s-]/g, '').trim();
    if (!cleanName) cleanName = 'item';
    let label = prefix + cleanName;
    if (label.length > 25) label = label.substring(0, 25);
    return label || prefix + 'item';
}

module.exports = {
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const member = guild.members.cache.get(userId);

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return reply(interactionOrMessage, 'You need **Administrator** permission to use this command.');
        }

        const existing = await TicketConfig.findOne({ where: { guildId: guild.id } });

        if (existing) {
            return reply(interactionOrMessage, 'Ticket system is already configured. Use `ticket reset` first to clear the current configuration before running setup again.');
        }

        await startSetupFlow(interactionOrMessage, guild, false);
    }
};

async function startSetupFlow(context, guild, isEdit) {
    const userId = context.user?.id || context.author?.id;

    const setupTypeMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_setup_type')
        .setPlaceholder('Choose setup type...')
        .setMaxValues(1)
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Single Category System').setDescription('All tickets under one category').setValue('single'),
            new StringSelectMenuOptionBuilder().setLabel('Multiple Category System').setDescription('Different categories for different ticket types').setValue('multiple')
        );

    const setupContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Ticket System Setup'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Choose how you want to organize your tickets:\n- **Single Category System**\n> All tickets will be created under one category\n- **Multiple Category System**\n> Different ticket types will have their own categories'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addActionRowComponents(new ActionRowBuilder().addComponents(setupTypeMenu));

    let setupMsg;
    if (isEdit) {
        setupMsg = await context.update({ components: [setupContainer] });
    } else {
        setupMsg = await context.reply({ components: [setupContainer], flags: MessageFlags.IsComponentsV2 });
        if (!setupMsg) setupMsg = await context.fetchReply();
    }

    const setupData = {
        setupType: null, panelChannelId: null, supportRoleId: null,
        defaultCategoryId: null, logChannelId: null,
        panelTitle: 'Support Tickets', panelDescription: 'Select a category to create a support ticket',
        panelImage: null, panelThumbnail: null,
        categories: [],
        channelPage: 0, rolePage: 0, categoryPage: 0, logPage: 0
    };

    const filter = i => i.user.id === userId;
    const collector = setupMsg.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async interaction => {
        try {
            const id = interaction.customId;
            if (id === 'ticket_setup_type') {
                setupData.setupType = interaction.values[0];
                await showChannelRoleSelection(interaction, guild, setupData);
            } else if (id === 'ticket_channel_select') {
                setupData.panelChannelId = interaction.values[0];
                await showChannelRoleSelection(interaction, guild, setupData);
            } else if (id === 'ticket_role_select') {
                setupData.supportRoleId = interaction.values[0];
                await showChannelRoleSelection(interaction, guild, setupData);
            } else if (id === 'ticket_category_select') {
                setupData.defaultCategoryId = interaction.values[0];
                await showChannelRoleSelection(interaction, guild, setupData);
            } else if (id === 'ticket_log_select') {
                setupData.logChannelId = interaction.values[0];
                await showChannelRoleSelection(interaction, guild, setupData);
            } else if (id.startsWith('ticket_channel_') || id.startsWith('ticket_role_') || id.startsWith('ticket_category_') || id.startsWith('ticket_log_')) {
                if (id.endsWith('_prev') || id.endsWith('_next')) {
                    const parts = id.split('_');
                    const section = parts[1];
                    const dir = parts[2];
                    const pageKey = section + 'Page';
                    if (dir === 'prev') setupData[pageKey] = Math.max(0, setupData[pageKey] - 1);
                    else setupData[pageKey]++;
                    await showChannelRoleSelection(interaction, guild, setupData);
                }
            } else if (id === 'ticket_customize') {
                await showCustomizeModal(interaction, setupData);
            } else if (id === 'ticket_finish') {
                await finishSetup(interaction, guild, setupData);
                collector.stop();
            }
        } catch (error) {
            console.error('Ticket setup error:', error);
            try {
                const errContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Setup Error'))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('An error occurred during setup. Please try again.'));
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
                } else {
                    await interaction.reply({ components: [errContainer], flags: MessageFlags.IsComponentsV2, ephemeral: true });
                }
            } catch (e) { console.error('Failed to send error:', e); }
        }
    });
}

async function showChannelRoleSelection(interaction, guild, setupData) {
    const chunkSize = 24;

    const allTextChannels = Array.from(guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel']))
        .sort((a, b) => a.name.localeCompare(b.name)).values());

    const allCategories = Array.from(guild.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory && c.permissionsFor(guild.members.me)?.has(['ViewChannel']))
        .sort((a, b) => a.name.localeCompare(b.name)).values());

    const allRoles = Array.from(guild.roles.cache
        .filter(r => !r.managed && r.id !== guild.id && r.position < guild.members.me.roles.highest.position)
        .sort((a, b) => a.name.localeCompare(b.name)).values());

    if (allCategories.length === 0) {
        try {
            const newCat = await guild.channels.create({
                name: 'TICKETS', type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: guild.members.me, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels] }
                ]
            });
            allCategories.push(newCat);
        } catch (e) { console.error('Failed to create category:', e); }
    }

    if (allTextChannels.length === 0 || allRoles.length === 0) {
        const errContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Setup Requirements Not Met'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Missing text channels or assignable roles. Please ensure the bot has proper permissions.'));
        return await interaction.update({ components: [errContainer] });
    }

    if (allCategories.length === 0) {
        allCategories.push({ id: 'none', name: 'No Category (Root Level)' });
    }

    const chunk = arr => { const c = []; for (let i = 0; i < arr.length; i += chunkSize) c.push(arr.slice(i, i + chunkSize)); return c; };
    const channelChunks = chunk(allTextChannels);
    const roleChunks = chunk(allRoles);
    const categoryChunks = chunk(allCategories);

    setupData.channelPage = Math.min(setupData.channelPage, Math.max(0, channelChunks.length - 1));
    setupData.rolePage = Math.min(setupData.rolePage, Math.max(0, roleChunks.length - 1));
    setupData.categoryPage = Math.min(setupData.categoryPage, Math.max(0, categoryChunks.length - 1));
    setupData.logPage = Math.min(setupData.logPage, Math.max(0, channelChunks.length - 1));

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Server Configuration'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Setup Type:** ${setupData.setupType === 'single' ? 'Single Category' : 'Multiple Categories'}\nPlease configure the following settings:`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    const addMenu = (label, items, customId, selected, page, totalPages) => {
        if (items.length === 0) return;
        const isChannel = customId.includes('channel') || customId.includes('log');
        const options = items.map(item => {
            const lbl = createValidLabel(item.name, isChannel ? '#' : customId.includes('role') ? '@' : '');
            return new StringSelectMenuOptionBuilder()
                .setLabel(lbl).setDescription(label).setValue(item.id)
                .setDefault(item.id === selected);
        });
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${label}** (Page ${page + 1}/${totalPages})`));
        container.addActionRowComponents(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(customId)
                .setPlaceholder(selected ? `Selected` : `Select...`).setMaxValues(1).addOptions(options)
        ));
        if (totalPages > 1) {
            const prefix = customId.replace('_select', '');
            container.addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`${prefix}_prev`).setLabel('Prev').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId(`${prefix}_next`).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
            ));
        }
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
    };

    addMenu('Step 1: Panel Channel', channelChunks[setupData.channelPage] || [], 'ticket_channel_select', setupData.panelChannelId, setupData.channelPage, channelChunks.length);
    addMenu('Step 2: Support Role', roleChunks[setupData.rolePage] || [], 'ticket_role_select', setupData.supportRoleId, setupData.rolePage, roleChunks.length);

    if (setupData.setupType === 'single') {
        addMenu('Step 3: Ticket Category', categoryChunks[setupData.categoryPage] || [], 'ticket_category_select', setupData.defaultCategoryId, setupData.categoryPage, categoryChunks.length);
    } else if (!setupData.defaultCategoryId && allCategories.length > 0) {
        setupData.defaultCategoryId = allCategories[0].id;
    }

    addMenu(`Step ${setupData.setupType === 'single' ? '4' : '3'}: Log Channel`, channelChunks[setupData.logPage] || [], 'ticket_log_select', setupData.logChannelId, setupData.logPage, channelChunks.length);

    const isValid = setupData.setupType === 'multiple'
        ? (setupData.panelChannelId && setupData.supportRoleId && setupData.logChannelId)
        : (setupData.panelChannelId && setupData.supportRoleId && setupData.defaultCategoryId && setupData.logChannelId);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_customize').setLabel('Customize Panel').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_finish').setLabel('Finish Setup').setStyle(ButtonStyle.Primary).setDisabled(!isValid)
    ));

    await interaction.update({ components: [container] });
}

async function showCustomizeModal(interaction, setupData) {
    const modal = new ModalBuilder().setCustomId('ticket_customize_modal').setTitle('Customize Ticket Panel');

    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_title').setLabel('Panel Title').setStyle(TextInputStyle.Short).setValue(setupData.panelTitle).setMaxLength(100).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_description').setLabel('Panel Description').setStyle(TextInputStyle.Paragraph).setValue(setupData.panelDescription).setMaxLength(1000).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_image').setLabel('Image URL (optional)').setStyle(TextInputStyle.Short).setValue(setupData.panelImage || '').setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_thumbnail').setLabel('Thumbnail URL (optional)').setStyle(TextInputStyle.Short).setValue(setupData.panelThumbnail || '').setRequired(false))
    );

    await interaction.showModal(modal);

    try {
        const m = await interaction.awaitModalSubmit({ time: 300000 });
        try { setupData.panelTitle = m.fields.getTextInputValue('panel_title') || setupData.panelTitle; } catch {}
        try { setupData.panelDescription = m.fields.getTextInputValue('panel_description') || setupData.panelDescription; } catch {}
        try { setupData.panelImage = m.fields.getTextInputValue('panel_image') || null; } catch {}
        try { setupData.panelThumbnail = m.fields.getTextInputValue('panel_thumbnail') || null; } catch {}
        await m.reply({ content: 'Panel customized successfully.', ephemeral: true });
    } catch {}
}

async function finishSetup(interaction, guild, setupData) {
    try {
        await TicketConfig.upsert({
            guildId: guild.id,
            setupType: setupData.setupType,
            panelChannelId: setupData.panelChannelId,
            supportRoleId: setupData.supportRoleId,
            defaultCategoryId: setupData.defaultCategoryId,
            logChannelId: setupData.logChannelId,
            panelTitle: setupData.panelTitle,
            panelDescription: setupData.panelDescription,
            panelImage: setupData.panelImage,
            panelThumbnail: setupData.panelThumbnail,
        });

        const doneContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Setup Complete'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Use `ticket addcategory` to add ticket categories, then `ticket panel` to send the panel.'));

        await interaction.update({ components: [doneContainer] });
    } catch (error) {
        console.error('Finish setup error:', error);
        try {
            if (interaction.replied || interaction.deferred) await interaction.editReply({ content: 'Failed to complete setup. Please try again.' });
            else await interaction.reply({ content: 'Failed to complete setup. Please try again.', ephemeral: true });
        } catch {}
    }
}

async function sendTicketPanel(guild, setupData) {
    const panelChannel = guild.channels.cache.get(setupData.panelChannelId);
    if (!panelChannel) return;

    const panelContainer = new ContainerBuilder();

    const title = setupData.panelTitle || 'Support Tickets';
    const titleContent = `**${title}**${setupData.panelDescription ? '\n' + setupData.panelDescription : ''}`;
    const titleSection = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(titleContent));
    const serverIcon = guild.iconURL({ dynamic: true, size: 256 });
    if (!setupData.panelThumbnail && serverIcon) titleSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(serverIcon));
    else if (setupData.panelThumbnail) titleSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(setupData.panelThumbnail));
    panelContainer.addSectionComponents(titleSection);

    panelContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    if (setupData.panelImage) {
        try {
            panelContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(setupData.panelImage).setDescription('Support System'))
            );
            panelContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        } catch {}
    }

    const options = setupData.categories.map(cat => {
        const opt = new StringSelectMenuOptionBuilder()
            .setLabel(cat.name.substring(0, 25))
            .setValue(cat.name);
        if (cat.description) opt.setDescription(cat.description.substring(0, 50));
        if (cat.emoji) { try { opt.setEmoji(cat.emoji); } catch { opt.setEmoji('🎫'); } }
        return opt;
    });

    panelContainer.addActionRowComponents(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('create_ticket').setPlaceholder('Select a category to create a ticket...').setMaxValues(1).addOptions(options)
    ));

    await panelChannel.send({ components: [panelContainer], flags: MessageFlags.IsComponentsV2 });
}
