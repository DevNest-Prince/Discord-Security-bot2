


const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    AuditLogEvent,
    PermissionFlagsBits
} = require('discord.js');
const { AntinukeConfig, AntinukeWhitelist } = require('../../../database/models');

const actionTracker = new Map();
const pendingPunishments = new Set();

// Auto-recovery: short-lived snapshots of deleted channels/roles so they can be recreated
// if the deletion turns out to be part of a punished nuke attempt.
const recentlyDeleted = new Map(); // guildId -> [{ type, data, executorId, deletedAt }]
// Auto-revert: short-lived snapshots of created channels/roles so they can be removed
// again if the creation turns out to be part of a punished nuke attempt.
const recentlyCreated = new Map(); // guildId -> [{ type, id, executorId, createdAt }]
const RECOVERY_WINDOW_MS = 120000; // only recover/revert things created or deleted in the last 2 minutes

function snapshotDeletion(guildId, entry) {
    if (!recentlyDeleted.has(guildId)) recentlyDeleted.set(guildId, []);
    recentlyDeleted.get(guildId).push({ ...entry, deletedAt: Date.now() });
}

function snapshotCreation(guildId, entry) {
    if (!recentlyCreated.has(guildId)) recentlyCreated.set(guildId, []);
    recentlyCreated.get(guildId).push({ ...entry, createdAt: Date.now() });
}

const antinukeConfigCache = new Map();
const whitelistCache = new Map();
const ANTINUKE_CACHE_TTL = 120000;
const WHITELIST_CACHE_TTL = 120000;

function getCachedConfig(guildId) {
    const entry = antinukeConfigCache.get(guildId);
    if (entry && Date.now() - entry.ts < ANTINUKE_CACHE_TTL) return entry.val;
    return undefined;
}
function setCachedConfig(guildId, val) {
    antinukeConfigCache.set(guildId, { val, ts: Date.now() });
}

function getCachedWhitelist(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const entry = whitelistCache.get(key);
    if (entry && Date.now() - entry.ts < WHITELIST_CACHE_TTL) return entry.val;
    return undefined;
}
function setCachedWhitelist(guildId, userId, val) {
    whitelistCache.set(`${guildId}:${userId}`, { val, ts: Date.now() });
}

function getTrackerKey(guildId, userId, action) {
    return `${guildId}-${userId}-${action}`;
}

function trackAction(guildId, userId, action) {
    const key = getTrackerKey(guildId, userId, action);
    const now = Date.now();

    if (!actionTracker.has(key)) {
        actionTracker.set(key, []);
    }

    actionTracker.get(key).push(now);
}

function getActionCount(guildId, userId, action, timeframeMs) {
    const key = getTrackerKey(guildId, userId, action);
    const now = Date.now();

    if (!actionTracker.has(key)) {
        return 0;
    }

    const actions = actionTracker.get(key).filter(time => now - time < timeframeMs);

    if (actions.length === 0) {
        actionTracker.delete(key);
    } else {
        actionTracker.set(key, actions);
    }

    return actions.length;
}

function cleanupOldActions() {
    const now = Date.now();
    const maxAge = 3600000;

    for (const [key, times] of actionTracker.entries()) {
        const recentTimes = times.filter(time => now - time < maxAge);
        if (recentTimes.length === 0) {
            actionTracker.delete(key);
        } else if (recentTimes.length !== times.length) {
            actionTracker.set(key, recentTimes);
        }
    }

    for (const [key, entry] of antinukeConfigCache.entries()) {
        if (now - entry.ts >= ANTINUKE_CACHE_TTL * 5) antinukeConfigCache.delete(key);
    }
    for (const [key, entry] of whitelistCache.entries()) {
        if (now - entry.ts >= WHITELIST_CACHE_TTL * 5) whitelistCache.delete(key);
    }

    for (const [guildId, items] of recentlyDeleted.entries()) {
        const fresh = items.filter(i => now - i.deletedAt < RECOVERY_WINDOW_MS);
        if (fresh.length === 0) recentlyDeleted.delete(guildId);
        else recentlyDeleted.set(guildId, fresh);
    }

    for (const [guildId, items] of recentlyCreated.entries()) {
        const fresh = items.filter(i => now - i.createdAt < RECOVERY_WINDOW_MS);
        if (fresh.length === 0) recentlyCreated.delete(guildId);
        else recentlyCreated.set(guildId, fresh);
    }
}

async function getConfig(guildId) {
    let config = getCachedConfig(guildId);
    if (config === undefined) {
        config = await AntinukeConfig.findOne({ where: { guildId } });
        setCachedConfig(guildId, config);
    }
    return config;
}

async function isWhitelisted(guildId, userId, eventType = null) {
    let entry = getCachedWhitelist(guildId, userId);
    if (entry === undefined) {
        entry = await AntinukeWhitelist.findOne({ where: { guildId, userId } });
        setCachedWhitelist(guildId, userId, entry);
    }
    if (!entry) return false;

    const events = entry.events;
    if (!events || events.length === 0) return true;

    if (eventType && events.includes(eventType)) return true;

    return !eventType;
}

async function getAuditLogExecutor(guild, auditType, targetId = null, timeWindow = 5000) {
    try {
        const auditLogs = await guild.fetchAuditLogs({ type: auditType, limit: 5 });
        const now = Date.now();

        for (const entry of auditLogs.entries.values()) {
            if ((now - entry.createdTimestamp) < timeWindow) {
                if (!targetId || entry.target?.id === targetId) {
                    return entry.executor;
                }
            }
        }
        return null;
    } catch {
        return null;
    }
}

async function revertCreated(guild, executorId, config) {
    if (!config.autoRecovery) return;
    const items = recentlyCreated.get(guild.id);
    if (!items || !items.length) return;

    const toRevert = items.filter(i => i.executorId === executorId && Date.now() - i.createdAt < RECOVERY_WINDOW_MS);
    if (!toRevert.length) return;

    // Remove the ones we're about to handle so they aren't reverted twice.
    recentlyCreated.set(guild.id, items.filter(i => !toRevert.includes(i)));

    let reverted = 0;
    for (const item of toRevert) {
        try {
            if (item.type === 'channel') {
                const channel = guild.channels.cache.get(item.id) || await guild.channels.fetch(item.id).catch(() => null);
                if (channel) {
                    await channel.delete('Antinuke auto-revert: removing attacker-created channel');
                    reverted++;
                }
            } else if (item.type === 'role') {
                const role = guild.roles.cache.get(item.id) || await guild.roles.fetch(item.id).catch(() => null);
                if (role) {
                    await role.delete('Antinuke auto-revert: removing attacker-created role');
                    reverted++;
                }
            } else if (item.type === 'webhook') {
                const webhook = await guild.client.fetchWebhook(item.id).catch(() => null);
                if (webhook) {
                    await webhook.delete('Antinuke auto-revert: removing attacker-created webhook');
                    reverted++;
                }
            }
        } catch { /* best effort, skip failures */ }
    }

    if (reverted && config.logChannelId) {
        const channel = guild.channels.cache.get(config.logChannelId);
        if (channel) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Auto-Revert'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Removed **${reverted}** attacker-created ${reverted === 1 ? 'item' : 'items'} after the attack was stopped.`));
            await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        }
    }
}

async function recoverDeleted(guild, executorId, config) {
    if (!config.autoRecovery) return;
    const items = recentlyDeleted.get(guild.id);
    if (!items || !items.length) return;

    const toRestore = items.filter(i => i.executorId === executorId && Date.now() - i.deletedAt < RECOVERY_WINDOW_MS);
    if (!toRestore.length) return;

    // Remove the ones we're about to handle so they aren't restored twice.
    recentlyDeleted.set(guild.id, items.filter(i => !toRestore.includes(i)));

    let restored = 0;
    for (const item of toRestore) {
        try {
            if (item.type === 'channel') {
                await guild.channels.create({
                    name: item.data.name,
                    type: item.data.type,
                    parent: item.data.parentId || undefined,
                    position: item.data.position,
                    topic: item.data.topic || undefined,
                    nsfw: item.data.nsfw,
                    bitrate: item.data.bitrate || undefined,
                    userLimit: item.data.userLimit || undefined,
                    rateLimitPerUser: item.data.rateLimitPerUser || undefined,
                    permissionOverwrites: item.data.permissionOverwrites,
                    reason: 'Antinuke auto-recovery'
                });
                restored++;
            } else if (item.type === 'role') {
                await guild.roles.create({
                    name: item.data.name,
                    color: item.data.color,
                    hoist: item.data.hoist,
                    permissions: item.data.permissions,
                    mentionable: item.data.mentionable,
                    reason: 'Antinuke auto-recovery'
                });
                restored++;
            }
        } catch { /* best effort, skip failures */ }
    }

    if (restored && config.logChannelId) {
        const channel = guild.channels.cache.get(config.logChannelId);
        if (channel) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Auto-Recovery'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Restored **${restored}** deleted ${restored === 1 ? 'item' : 'items'} after the attack was stopped.`));
            await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        }
    }
}

async function executePunishment(guild, user, config, reason) {
    try {
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        if (member.id === guild.ownerId) return;

        const botMember = guild.members.me;
        if (!botMember || member.roles.highest.position >= botMember.roles.highest.position) return;

        switch (config.punishment) {
            case 'stripall': {
                const rolesToRemove = member.roles.cache
                    .filter(r => r.id !== guild.id && r.position < botMember.roles.highest.position);
                if (rolesToRemove.size > 0) {
                    await member.roles.remove(rolesToRemove, `Antinuke: ${reason}`).catch(() => {});
                }
                break;
            }
            case 'kick':
                await member.kick(`Antinuke: ${reason}`).catch(() => {});
                break;
            case 'ban':
                await guild.members.ban(user.id, { reason: `Antinuke: ${reason}` }).catch(() => {});
                break;
        }

        await sendLog(guild, config, user, reason, config.punishment);

        // Undo everything this user did in the recovery window: anything they created
        // gets removed, anything they deleted gets restored - regardless of which
        // specific action tripped the threshold.
        await revertCreated(guild, user.id, config);
        await recoverDeleted(guild, user.id, config);
    } catch {}
}

async function sendLog(guild, config, user, reason, punishment) {
    if (!config.logChannelId) return;

    try {
        const channel = guild.channels.cache.get(config.logChannelId);
        if (!channel) return;

        const punishmentLabels = {
            stripall: 'Roles Stripped',
            kick: 'Kicked',
            ban: 'Banned'
        };

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Antinuke Triggered')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**User:** ${user.username} (${user.id})\n` +
                    `**Reason:** ${reason}\n` +
                    `**Action Taken:** ${punishmentLabels[punishment] || punishment}\n` +
                    `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                )
            );

        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    } catch {}
}

async function handleAntiAction(guild, executor, action, config) {
    if (!executor) return;

    if (executor.id === guild.ownerId) return;
    if (executor.id === guild.client.user.id) return;
    if (await isWhitelisted(guild.id, executor.id, action)) return;

    trackAction(guild.id, executor.id, action);
    const count = getActionCount(guild.id, executor.id, action, config.timeframe * 1000);

    if (count >= config.threshold) {
        const punishKey = `${guild.id}:${executor.id}`;
        if (pendingPunishments.has(punishKey)) return;
        pendingPunishments.add(punishKey);
        setTimeout(() => pendingPunishments.delete(punishKey), 30000);
        await executePunishment(guild, executor, config, `Mass ${action} detected (${count} actions)`);
    }
}

module.exports = {
    name: 'antinukeEvents',

    async init(client) {
        setInterval(cleanupOldActions, 300000);

        client.on('guildBanAdd', async (ban) => {
            const config = await getConfig(ban.guild.id);
            if (!config?.enabled || !config.antiBan) return;

            const executor = await getAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
            await handleAntiAction(ban.guild, executor, 'ban', config);
        });

        client.on('guildMemberRemove', async (member) => {
            const config = await getConfig(member.guild.id);
            if (!config?.enabled || !config.antiKick) return;

            const executor = await getAuditLogExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
            if (executor) {
                await handleAntiAction(member.guild, executor, 'kick', config);
            }
        });

        client.on('channelCreate', async (channel) => {
            if (!channel.guild) return;
            const config = await getConfig(channel.guild.id);
            if (!config?.enabled) return;

            const executor = await getAuditLogExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
            if (config.autoRecovery && executor) {
                snapshotCreation(channel.guild.id, {
                    type: 'channel',
                    executorId: executor.id,
                    id: channel.id
                });
            }
            if (!config.antiChannelCreate) return;

            await handleAntiAction(channel.guild, executor, 'channel_create', config);
        });

        client.on('channelDelete', async (channel) => {
            if (!channel.guild) return;
            const config = await getConfig(channel.guild.id);
            if (!config?.enabled) return;

            const executor = await getAuditLogExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
            if (config.autoRecovery && executor) {
                snapshotDeletion(channel.guild.id, {
                    type: 'channel',
                    executorId: executor.id,
                    data: {
                        name: channel.name,
                        type: channel.type,
                        parentId: channel.parentId,
                        position: channel.rawPosition ?? channel.position,
                        topic: channel.topic,
                        nsfw: channel.nsfw,
                        bitrate: channel.bitrate,
                        userLimit: channel.userLimit,
                        rateLimitPerUser: channel.rateLimitPerUser,
                        permissionOverwrites: channel.permissionOverwrites?.cache?.map(o => ({ id: o.id, type: o.type, allow: o.allow, deny: o.deny }))
                    }
                });
            }
            if (!config.antiChannelDelete) return;

            await handleAntiAction(channel.guild, executor, 'channel_delete', config);
        });

        client.on('roleCreate', async (role) => {
            const config = await getConfig(role.guild.id);
            if (!config?.enabled) return;

            const executor = await getAuditLogExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
            if (config.autoRecovery && executor) {
                snapshotCreation(role.guild.id, {
                    type: 'role',
                    executorId: executor.id,
                    id: role.id
                });
            }
            if (!config.antiRoleCreate) return;

            await handleAntiAction(role.guild, executor, 'role_create', config);
        });

        client.on('roleDelete', async (role) => {
            const config = await getConfig(role.guild.id);
            if (!config?.enabled) return;

            const executor = await getAuditLogExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
            if (config.autoRecovery && executor) {
                snapshotDeletion(role.guild.id, {
                    type: 'role',
                    executorId: executor.id,
                    data: {
                        name: role.name,
                        color: role.color,
                        hoist: role.hoist,
                        permissions: role.permissions.bitfield,
                        mentionable: role.mentionable
                    }
                });
            }
            if (!config.antiRoleDelete) return;

            await handleAntiAction(role.guild, executor, 'role_delete', config);
        });

        client.on('roleUpdate', async (oldRole, newRole) => {
            const config = await getConfig(newRole.guild.id);
            if (!config?.enabled || !config.antiRoleUpdate) return;

            const dangerousPerms = [
                PermissionFlagsBits.Administrator,
                PermissionFlagsBits.BanMembers,
                PermissionFlagsBits.KickMembers,
                PermissionFlagsBits.ManageGuild,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
                PermissionFlagsBits.ManageWebhooks
            ];

            let dangerousChange = false;
            for (const perm of dangerousPerms) {
                if (!oldRole.permissions.has(perm) && newRole.permissions.has(perm)) {
                    dangerousChange = true;
                    break;
                }
            }

            if (!dangerousChange) return;

            const executor = await getAuditLogExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
            await handleAntiAction(newRole.guild, executor, 'role_update', config);
        });

        // discord.js has no dedicated webhookCreate/Delete/Update client events, and no
        // event for integrations or prunes either - guildAuditLogEntryCreate covers all of them.
        client.on('guildAuditLogEntryCreate', async (entry, guild) => {
            const config = await getConfig(guild.id);
            if (!config?.enabled) return;
            const executor = entry.executor;
            if (!executor) return;

            switch (entry.action) {
                case AuditLogEvent.WebhookCreate:
                    if (config.autoRecovery && entry.targetId) {
                        snapshotCreation(guild.id, {
                            type: 'webhook',
                            executorId: executor.id,
                            id: entry.targetId
                        });
                    }
                    if (config.antiWebhookCreate) await handleAntiAction(guild, executor, 'webhook_create', config);
                    break;
                case AuditLogEvent.WebhookDelete:
                    if (config.antiWebhookDelete) await handleAntiAction(guild, executor, 'webhook_delete', config);
                    break;
                case AuditLogEvent.WebhookUpdate:
                    if (config.antiWebhookUpdate) await handleAntiAction(guild, executor, 'webhook_update', config);
                    break;
                case AuditLogEvent.IntegrationCreate:
                    if (config.antiIntegration) await handleAntiAction(guild, executor, 'integration_create', config);
                    break;
                case AuditLogEvent.MemberPrune:
                    if (config.antiPrune) await handleAntiAction(guild, executor, 'prune', config);
                    break;
                case AuditLogEvent.MemberRoleUpdate: {
                    if (!config.antiMemberUpdate) break;
                    const dangerousPerms = [
                        PermissionFlagsBits.Administrator,
                        PermissionFlagsBits.BanMembers,
                        PermissionFlagsBits.KickMembers,
                        PermissionFlagsBits.ManageGuild,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageRoles,
                        PermissionFlagsBits.ManageWebhooks
                    ];
                    const addedRoleIds = (entry.changes || [])
                        .filter(c => c.key === '$add')
                        .flatMap(c => (Array.isArray(c.new) ? c.new : []).map(r => r.id));
                    const grantedDangerousRole = addedRoleIds.some(id => {
                        const role = guild.roles.cache.get(id);
                        return role && dangerousPerms.some(p => role.permissions.has(p));
                    });
                    if (grantedDangerousRole) await handleAntiAction(guild, executor, 'member_update', config);
                    break;
                }
            }
        });

        client.on('messageCreate', async (message) => {
            if (!message.guild || message.author.bot) return;
            if (!message.mentions.everyone) return;

            const config = await getConfig(message.guild.id);
            if (!config?.enabled || !config.antiEveryoneMention) return;

            await handleAntiAction(message.guild, message.author, 'everyone_mention', config);
        });

        client.on('guildMemberAdd', async (member) => {
            if (!member.user.bot) return;

            const config = await getConfig(member.guild.id);
            if (!config?.enabled || !config.antiBot) return;

            const executor = await getAuditLogExecutor(member.guild, AuditLogEvent.BotAdd, member.id);
            if (!executor) return;
            if (executor.id === member.guild.ownerId) return;
            if (executor.id === member.guild.client.user.id) return;
            if (await isWhitelisted(member.guild.id, executor.id, 'bot_add')) return;

            try {
                await member.kick('Antinuke: Unauthorized bot addition');
                await executePunishment(member.guild, executor, config, 'Unauthorized bot addition');
            } catch {}
        });

        client.on('guildUpdate', async (oldGuild, newGuild) => {
            const config = await getConfig(newGuild.id);
            if (!config?.enabled || !config.antiGuildUpdate) return;

            const executor = await getAuditLogExecutor(newGuild, AuditLogEvent.GuildUpdate);
            await handleAntiAction(newGuild, executor, 'guild_update', config);
        });

        client.on('emojiCreate', async (emoji) => {
            const config = await getConfig(emoji.guild.id);
            if (!config?.enabled || !config.antiEmoji) return;

            const executor = await getAuditLogExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
            await handleAntiAction(emoji.guild, executor, 'emoji_create', config);
        });

        client.on('emojiDelete', async (emoji) => {
            const config = await getConfig(emoji.guild.id);
            if (!config?.enabled || !config.antiEmoji) return;

            const executor = await getAuditLogExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
            await handleAntiAction(emoji.guild, executor, 'emoji_delete', config);
        });

        client.on('emojiUpdate', async (oldEmoji, newEmoji) => {
            const config = await getConfig(newEmoji.guild.id);
            if (!config?.enabled || !config.antiEmoji) return;

            const executor = await getAuditLogExecutor(newEmoji.guild, AuditLogEvent.EmojiUpdate, newEmoji.id);
            await handleAntiAction(newEmoji.guild, executor, 'emoji_update', config);
        });

        client.on('channelUpdate', async (oldChannel, newChannel) => {
            if (!newChannel.guild) return;
            const config = await getConfig(newChannel.guild.id);
            if (!config?.enabled || !config.antiChannelEdit) return;

            const executor = await getAuditLogExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
            await handleAntiAction(newChannel.guild, executor, 'channel_edit', config);
        });
    }
};
