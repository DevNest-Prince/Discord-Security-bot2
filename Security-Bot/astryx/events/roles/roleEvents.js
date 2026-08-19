
const { RoleConfig, StickyRole, TempRole } = require('../../../database/models');
const { Op } = require('sequelize');

const SWEEP_INTERVAL = 60000; // 1 minute

async function getRoleConfig(guildId) {
    return RoleConfig.findOne({ where: { guildId } });
}

async function handleJoin(member) {
    try {
        if (member.user.bot) return;
        const guild = member.guild;
        const config = await getRoleConfig(guild.id);
        if (!config) return;

        const me = guild.members.me;
        const canManage = (role) => role && !role.managed && me && role.position < me.roles.highest.position;

        // Sticky roles: restore saved roles on rejoin (takes priority, merges with autoroles).
        const rolesToAdd = new Set();
        if (config.stickyEnabled) {
            const sticky = await StickyRole.findOne({ where: { guildId: guild.id, userId: member.id } });
            if (sticky) {
                const ids = JSON.parse(sticky.roleIds || '[]');
                for (const id of ids) {
                    const role = guild.roles.cache.get(id);
                    if (canManage(role)) rolesToAdd.add(id);
                }
                await sticky.destroy().catch(() => {});
            }
        }

        // Auto-roles on join.
        const autoRoles = JSON.parse(config.autoRoleIds || '[]');
        for (const id of autoRoles) {
            const role = guild.roles.cache.get(id);
            if (canManage(role)) rolesToAdd.add(id);
        }

        if (rolesToAdd.size) {
            await member.roles.add([...rolesToAdd], 'Auto-role / sticky role restore').catch(() => {});
        }
    } catch (error) {
        console.error('roleEvents guildMemberAdd error:', error);
    }
}

async function handleLeave(member) {
    try {
        const guild = member.guild;
        const config = await getRoleConfig(guild.id);
        if (!config || !config.stickyEnabled) return;

        const roleIds = member.roles.cache.filter(r => r.id !== guild.id && !r.managed).map(r => r.id);
        if (!roleIds.length) return;

        await StickyRole.destroy({ where: { guildId: guild.id, userId: member.id } });
        await StickyRole.create({ guildId: guild.id, userId: member.id, roleIds: JSON.stringify(roleIds) });
    } catch (error) {
        console.error('roleEvents guildMemberRemove error:', error);
    }
}

async function handleUpdate(oldMember, newMember) {
    try {
        const guild = newMember.guild;
        const config = await getRoleConfig(guild.id);
        if (!config || !config.boosterRoleId) return;

        const role = guild.roles.cache.get(config.boosterRoleId);
        if (!role) return;
        const me = guild.members.me;
        if (!me || role.managed || role.position >= me.roles.highest.position) return;

        const wasBoosting = !!oldMember.premiumSince;
        const isBoosting = !!newMember.premiumSince;
        if (wasBoosting === isBoosting) return;

        if (isBoosting && !newMember.roles.cache.has(role.id)) {
            await newMember.roles.add(role, 'Booster perk').catch(() => {});
        } else if (!isBoosting && newMember.roles.cache.has(role.id)) {
            await newMember.roles.remove(role, 'Stopped boosting').catch(() => {});
        }
    } catch (error) {
        console.error('roleEvents guildMemberUpdate error:', error);
    }
}

async function sweepTempRoles(client) {
    try {
        const expired = await TempRole.findAll({ where: { expiresAt: { [Op.lte]: new Date() } } });
        for (const record of expired) {
            try {
                const guild = client.guilds.cache.get(record.guildId);
                if (guild) {
                    const member = await guild.members.fetch(record.userId).catch(() => null);
                    const role = guild.roles.cache.get(record.roleId);
                    if (member && role) await member.roles.remove(role, 'Temp role expired').catch(() => {});
                }
            } catch { /* ignore individual failures */ }
            await record.destroy().catch(() => {});
        }
    } catch (error) {
        console.error('roleEvents temp-role sweep error:', error);
    }
}

function init(client) {
    client.on('guildMemberAdd', handleJoin);
    client.on('guildMemberRemove', handleLeave);
    client.on('guildMemberUpdate', handleUpdate);
    setInterval(() => sweepTempRoles(client), SWEEP_INTERVAL);
}

module.exports = { init };
