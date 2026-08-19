
const {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ChannelType, PermissionsBitField, MessageFlags
} = require('discord.js');

async function logRaidEvent(guild, config, title, description) {
    try {
        const channelId = config.logChannelId || config.alertChannelId;
        if (!channelId) return;
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${description}\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`));

        await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
    } catch (error) {
        console.error('Anti-raid logging error:', error);
    }
}

const LOCKABLE_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildVoice, ChannelType.GuildStageVoice];

async function applyLockdown(guild) {
    const everyone = guild.roles.everyone;
    let locked = 0;
    const channels = guild.channels.cache.filter(c => LOCKABLE_TYPES.includes(c.type));
    for (const channel of channels.values()) {
        try {
            await channel.permissionOverwrites.edit(everyone, { SendMessages: false, Connect: false }, { reason: 'Anti-raid lockdown' });
            locked++;
        } catch { /* ignore channels we can't edit */ }
    }
    return locked;
}

async function removeLockdown(guild) {
    const everyone = guild.roles.everyone;
    let unlocked = 0;
    const channels = guild.channels.cache.filter(c => LOCKABLE_TYPES.includes(c.type));
    for (const channel of channels.values()) {
        try {
            await channel.permissionOverwrites.edit(everyone, { SendMessages: null, Connect: null }, { reason: 'Anti-raid lockdown lifted' });
            unlocked++;
        } catch { /* ignore */ }
    }
    return unlocked;
}

function isStaff(member) {
    if (!member) return false;
    return member.permissions.has(PermissionsBitField.Flags.Administrator)
        || member.permissions.has(PermissionsBitField.Flags.ManageGuild)
        || member.guild.ownerId === member.id;
}

module.exports = { logRaidEvent, applyLockdown, removeLockdown, isStaff };
