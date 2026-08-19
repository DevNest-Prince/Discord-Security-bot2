
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');
const { SelfRoleMenu } = require('../../../../database/models');
const { isStaff, reply, canManageRole } = require('../../../utils/roleUtils');

// Build the ComponentsV2 panel message for a self-role menu record.
function buildPanel(menu, roles) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${menu.title || 'Self Roles'}`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    if (!roles.length) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent('*No roles added yet. Use `/roles selfrole add`.*'));
        return container;
    }

    const listText = roles.map(r => `${r.emoji ? r.emoji + ' ' : ''}<@&${r.roleId}>`).join('\n');
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(listText));

    if (menu.type === 'dropdown') {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`selfrole_menu:${menu.messageId}`)
            .setPlaceholder('Select a role...')
            .setMinValues(0)
            .setMaxValues(menu.mode === 'single' ? 1 : roles.length);
        for (const r of roles) {
            const opt = new StringSelectMenuOptionBuilder().setLabel(r.label || r.roleId).setValue(r.roleId);
            if (r.description) opt.setDescription(r.description);
            if (r.emoji) opt.setEmoji(r.emoji);
            select.addOptions(opt);
        }
        container.addActionRowComponents(new ActionRowBuilder().addComponents(select));
    } else {
        // Buttons, max 5 per row, 5 rows -> 25 roles cap.
        let row = new ActionRowBuilder();
        let count = 0;
        for (const r of roles) {
            const btn = new ButtonBuilder().setCustomId(`selfrole_btn:${menu.messageId}:${r.roleId}`).setLabel(r.label || 'Role').setStyle(ButtonStyle.Secondary);
            if (r.emoji) btn.setEmoji(r.emoji);
            row.addComponents(btn);
            count++;
            if (count % 5 === 0) {
                container.addActionRowComponents(row);
                row = new ActionRowBuilder();
            }
        }
        if (count % 5 !== 0) container.addActionRowComponents(row);
    }
    return container;
}

async function refreshPanel(guild, menu) {
    const roles = JSON.parse(menu.roles || '[]');
    const channel = guild.channels.cache.get(menu.channelId);
    if (!channel) return;
    const msg = await channel.messages.fetch(menu.messageId).catch(() => null);
    if (!msg) return;
    await msg.edit({ components: [buildPanel(menu, roles)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

module.exports = {
    name: 'selfrole',
    buildPanel,
    refreshPanel,
    async execute(interactionOrMessage, args, ctx = {}) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const isSlash = interactionOrMessage.isCommand?.();
        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Roles** permission to do that.');

        // Determine action: from group subcommand (slash) or first prefix arg.
        let action = ctx.subcommand;
        if (!isSlash) {
            action = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (action === 'create') return this.create(interactionOrMessage, args, isSlash, guild);
        if (action === 'add') return this.addRole(interactionOrMessage, args, isSlash, guild);
        if (action === 'remove') return this.removeRole(interactionOrMessage, args, isSlash, guild);
        if (action === 'delete') return this.deleteMenu(interactionOrMessage, args, isSlash, guild);
        return reply(interactionOrMessage, 'Usage: `selfrole create|add|remove|delete`');
    },

    async create(ctx, args, isSlash, guild) {
        let channel, title, type, mode;
        if (isSlash) {
            channel = ctx.options.getChannel('channel');
            title = ctx.options.getString('title') || 'Self Roles';
            type = ctx.options.getString('type') || 'button';
            mode = ctx.options.getString('mode') || 'toggle';
        } else {
            channel = ctx.mentions.channels.first();
            title = args.join(' ') || 'Self Roles';
            type = 'button';
            mode = 'toggle';
        }
        if (!channel) return reply(ctx, 'Provide a channel. Example: `/roles selfrole create channel:#roles`');

        const menuRecord = { title, type, mode };
        let panelMsg;
        try {
            panelMsg = await channel.send({ components: [buildPanel({ ...menuRecord, messageId: '0' }, [])], flags: MessageFlags.IsComponentsV2 });
        } catch {
            return reply(ctx, `I couldn't post in ${channel}. Check my permissions.`);
        }

        await SelfRoleMenu.create({ guildId: guild.id, channelId: channel.id, messageId: panelMsg.id, title, type, mode, roles: '[]' });
        // The panel customIds embed the real messageId, so rebuild once we know it.
        const menu = await SelfRoleMenu.findOne({ where: { messageId: panelMsg.id } });
        await refreshPanel(guild, menu);

        return reply(ctx, `Self-role menu created in ${channel}. Menu ID: \`${panelMsg.id}\`\nAdd roles with \`/roles selfrole add message_id:${panelMsg.id} role:@Role\``);
    },

    async addRole(ctx, args, isSlash, guild) {
        let messageId, role, label, emoji, description;
        if (isSlash) {
            messageId = ctx.options.getString('message_id');
            role = ctx.options.getRole('role');
            label = ctx.options.getString('label');
            emoji = ctx.options.getString('emoji');
            description = ctx.options.getString('description');
        } else {
            messageId = args[0];
            role = ctx.mentions.roles.first();
            label = args.slice(2).join(' ') || null;
        }
        if (!messageId || !role) return reply(ctx, 'Provide the menu message ID and a role.');

        const menu = await SelfRoleMenu.findOne({ where: { messageId, guildId: guild.id } });
        if (!menu) return reply(ctx, 'No self-role menu found with that message ID.');
        if (!canManageRole(guild, role)) return reply(ctx, `I can't manage <@&${role.id}>. Move my role above it and make sure it isn't a managed/integration role.`);

        const roles = JSON.parse(menu.roles || '[]');
        if (roles.some(r => r.roleId === role.id)) return reply(ctx, 'That role is already in the menu.');
        if (roles.length >= 25) return reply(ctx, 'A menu can hold at most 25 roles.');

        roles.push({ roleId: role.id, label: label || role.name, emoji: emoji || null, description: description || null });
        menu.roles = JSON.stringify(roles);
        await menu.save();
        await refreshPanel(guild, menu);
        return reply(ctx, `Added <@&${role.id}> to the menu.`);
    },

    async removeRole(ctx, args, isSlash, guild) {
        let messageId, role;
        if (isSlash) {
            messageId = ctx.options.getString('message_id');
            role = ctx.options.getRole('role');
        } else {
            messageId = args[0];
            role = ctx.mentions.roles.first();
        }
        if (!messageId || !role) return reply(ctx, 'Provide the menu message ID and a role.');

        const menu = await SelfRoleMenu.findOne({ where: { messageId, guildId: guild.id } });
        if (!menu) return reply(ctx, 'No self-role menu found with that message ID.');

        const roles = JSON.parse(menu.roles || '[]');
        const filtered = roles.filter(r => r.roleId !== role.id);
        if (filtered.length === roles.length) return reply(ctx, 'That role is not in the menu.');
        menu.roles = JSON.stringify(filtered);
        await menu.save();
        await refreshPanel(guild, menu);
        return reply(ctx, `Removed <@&${role.id}> from the menu.`);
    },

    async deleteMenu(ctx, args, isSlash, guild) {
        const messageId = isSlash ? ctx.options.getString('message_id') : args[0];
        if (!messageId) return reply(ctx, 'Provide the menu message ID.');
        const menu = await SelfRoleMenu.findOne({ where: { messageId, guildId: guild.id } });
        if (!menu) return reply(ctx, 'No self-role menu found with that message ID.');

        const channel = guild.channels.cache.get(menu.channelId);
        if (channel) {
            const msg = await channel.messages.fetch(menu.messageId).catch(() => null);
            if (msg) await msg.delete().catch(() => {});
        }
        await menu.destroy();
        return reply(ctx, 'Self-role menu deleted.');
    }
};
