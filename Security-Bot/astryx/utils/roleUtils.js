
const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

function isStaff(member) {
    if (!member) return false;
    return member.permissions.has(PermissionsBitField.Flags.Administrator)
        || member.permissions.has(PermissionsBitField.Flags.ManageRoles)
        || member.guild.ownerId === member.id;
}

function reply(ctx, text) {
    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
}

// True if the bot can manage (add/remove) the given role.
function canManageRole(guild, role) {
    const me = guild.members.me;
    if (!me) return false;
    if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return false;
    if (role.managed) return false;
    return role.position < me.roles.highest.position;
}

// Parse a human duration like "10m", "2h", "7d", "1w" into milliseconds. Returns null if invalid.
function parseDuration(input) {
    if (!input) return null;
    const match = String(input).trim().match(/^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)$/i);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    if (!value || value <= 0) return null;
    const unit = match[2].toLowerCase();
    const multipliers = {
        s: 1000, sec: 1000, secs: 1000,
        m: 60000, min: 60000, mins: 60000,
        h: 3600000, hr: 3600000, hrs: 3600000, hour: 3600000, hours: 3600000,
        d: 86400000, day: 86400000, days: 86400000,
        w: 604800000, week: 604800000, weeks: 604800000,
    };
    return value * multipliers[unit];
}

function formatDuration(ms) {
    const units = [
        ['w', 604800000], ['d', 86400000], ['h', 3600000], ['m', 60000], ['s', 1000],
    ];
    const parts = [];
    let remaining = ms;
    for (const [label, size] of units) {
        if (remaining >= size) {
            const count = Math.floor(remaining / size);
            remaining -= count * size;
            parts.push(`${count}${label}`);
        }
    }
    return parts.length ? parts.join(' ') : '0s';
}

module.exports = { isStaff, reply, canManageRole, parseDuration, formatDuration };
