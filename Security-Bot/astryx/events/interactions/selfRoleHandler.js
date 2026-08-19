
const { MessageFlags } = require('discord.js');
const { SelfRoleMenu } = require('../../../database/models');

async function handle(interaction) {
    const isButton = interaction.isButton?.();
    const isSelect = interaction.isStringSelectMenu?.();
    if (!isButton && !isSelect) return false;

    const id = interaction.customId;
    if (isButton && id.startsWith('selfrole_btn:')) { await handleButton(interaction); return true; }
    if (isSelect && id.startsWith('selfrole_menu:')) { await handleSelect(interaction); return true; }
    return false;
}

function canManage(guild, role) {
    const me = guild.members.me;
    return role && !role.managed && me && role.position < me.roles.highest.position;
}

async function handleButton(interaction) {
    // customId: selfrole_btn:<messageId>:<roleId>
    const [, messageId, roleId] = interaction.customId.split(':');
    const guild = interaction.guild;
    const member = interaction.member;

    const menu = await SelfRoleMenu.findOne({ where: { messageId, guildId: guild.id } });
    if (!menu) return interaction.reply({ content: 'This self-role menu no longer exists.', flags: MessageFlags.Ephemeral });

    const role = guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: 'That role no longer exists.', flags: MessageFlags.Ephemeral });
    if (!canManage(guild, role)) return interaction.reply({ content: "I can't assign that role (my role may be too low). Contact staff.", flags: MessageFlags.Ephemeral });

    try {
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(role, 'Self-role');
            return interaction.reply({ content: `Removed <@&${roleId}>.`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
        }

        // Single mode: remove other roles from this menu first.
        if (menu.mode === 'single') {
            const menuRoles = JSON.parse(menu.roles || '[]').map(r => r.roleId).filter(rid => rid !== roleId);
            const toRemove = menuRoles.filter(rid => member.roles.cache.has(rid));
            if (toRemove.length) await member.roles.remove(toRemove, 'Self-role single mode').catch(() => {});
        }
        await member.roles.add(role, 'Self-role');
        return interaction.reply({ content: `Added <@&${roleId}>.`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    } catch {
        return interaction.reply({ content: 'Something went wrong assigning that role.', flags: MessageFlags.Ephemeral });
    }
}

async function handleSelect(interaction) {
    // customId: selfrole_menu:<messageId>
    const messageId = interaction.customId.split(':')[1];
    const guild = interaction.guild;
    const member = interaction.member;

    const menu = await SelfRoleMenu.findOne({ where: { messageId, guildId: guild.id } });
    if (!menu) return interaction.reply({ content: 'This self-role menu no longer exists.', flags: MessageFlags.Ephemeral });

    const menuRoleIds = JSON.parse(menu.roles || '[]').map(r => r.roleId);
    const selected = interaction.values;

    const added = [], removed = [];
    try {
        for (const roleId of menuRoleIds) {
            const role = guild.roles.cache.get(roleId);
            if (!role || !canManage(guild, role)) continue;
            const shouldHave = selected.includes(roleId);
            const has = member.roles.cache.has(roleId);
            if (shouldHave && !has) { await member.roles.add(role, 'Self-role menu'); added.push(roleId); }
            else if (!shouldHave && has) { await member.roles.remove(role, 'Self-role menu'); removed.push(roleId); }
        }
    } catch { /* continue */ }

    const parts = [];
    if (added.length) parts.push(`Added: ${added.map(r => `<@&${r}>`).join(' ')}`);
    if (removed.length) parts.push(`Removed: ${removed.map(r => `<@&${r}>`).join(' ')}`);
    return interaction.reply({ content: parts.length ? parts.join('\n') : 'No changes.', flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

module.exports = { handle };
