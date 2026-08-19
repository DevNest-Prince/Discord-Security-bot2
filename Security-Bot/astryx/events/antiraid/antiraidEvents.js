
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { RaidConfig } = require('../../../database/models');
const { applyLockdown, logRaidEvent } = require('../../utils/raidUtils');

const configCache = new Map();
const CACHE_TTL = 60000;

const joinTracker = new Map();

async function getConfig(guildId) {
    const cached = configCache.get(guildId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.val;
    const val = await RaidConfig.findOne({ where: { guildId } });
    configCache.set(guildId, { val, ts: Date.now() });
    return val;
}

function invalidate(guildId) {
    configCache.delete(guildId);
}

function trackJoin(guildId, windowMs) {
    const now = Date.now();
    let arr = joinTracker.get(guildId) || [];
    arr = arr.filter(ts => now - ts < windowMs);
    arr.push(now);
    joinTracker.set(guildId, arr);
    return arr.length;
}

function init(client) {
    client.on('guildMemberAdd', async (member) => {
        try {
            if (member.user.bot) return;
            const guild = member.guild;
            const config = await getConfig(guild.id);
            if (!config || !config.enabled) return;

            // Anti-alt: kick accounts younger than the configured age.
            if (config.minAccountAgeDays > 0) {
                const ageMs = Date.now() - member.user.createdTimestamp;
                const minMs = config.minAccountAgeDays * 24 * 60 * 60 * 1000;
                if (ageMs < minMs) {
                    await member.send(`Your account is too new to join **${guild.name}**. Accounts must be at least ${config.minAccountAgeDays} day(s) old.`).catch(() => {});
                    await member.kick(`Anti-alt: account younger than ${config.minAccountAgeDays} days`).catch(() => {});
                    logRaidEvent(guild, config, 'Anti-Alt Kick', `**User:** ${member.user.tag} (<@${member.id}>)\n**Account Age:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`).catch(() => {});
                    return;
                }
            }

            // Verification gate: apply the unverified role until they click verify.
            if (config.verifyEnabled && config.unverifiedRoleId) {
                const role = guild.roles.cache.get(config.unverifiedRoleId);
                if (role) await member.roles.add(role, 'Verification gate').catch(() => {});
            }

            // Raid detection -> lockdown.
            const windowMs = (config.joinWindowSec || 10) * 1000;
            const count = trackJoin(guild.id, windowMs);
            if (count >= (config.joinThreshold || 8) && !config.lockdownActive) {
                config.lockdownActive = true;
                await config.save();
                invalidate(guild.id);

                const locked = await applyLockdown(guild);

                const alertChannel = guild.channels.cache.get(config.alertChannelId);
                if (alertChannel) {
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🚨 Raid Detected'))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `**${count}** members joined within **${config.joinWindowSec}s** (threshold: ${config.joinThreshold}).\n` +
                            `The server has been **locked down** (${locked} channels). Review new members, then click **Unlock** to restore.`
                        ))
                        .addActionRowComponents(new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('raid_unlock').setLabel('Unlock Server').setStyle(ButtonStyle.Danger)
                        ));
                    await alertChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                }

                logRaidEvent(guild, config, 'Raid Lockdown Triggered', `**Joins:** ${count} in ${config.joinWindowSec}s\n**Channels locked:** ${locked}`).catch(() => {});
            }
        } catch (error) {
            console.error('Anti-raid guildMemberAdd error:', error);
        }
    });
}

module.exports = { init, invalidate };
