
const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionsBitField } = require('discord.js');
const { RaidConfig } = require('../../../database/models');
const { removeLockdown, logRaidEvent, isStaff } = require('../../utils/raidUtils');

async function handle(interaction) {
    if (!interaction.isButton()) return false;
    const id = interaction.customId;

    if (id === 'raid_verify') { await handleVerify(interaction); return true; }
    if (id === 'raid_unlock') { await handleUnlock(interaction); return true; }

    return false;
}

async function handleVerify(interaction) {
    const guild = interaction.guild;
    const member = interaction.member;
    const config = await RaidConfig.findOne({ where: { guildId: guild.id } });

    if (!config || !config.verifyEnabled || !config.verifyRoleId) {
        return interaction.reply({ content: 'Verification is not configured.', flags: MessageFlags.Ephemeral });
    }

    const verifyRole = guild.roles.cache.get(config.verifyRoleId);
    if (!verifyRole) return interaction.reply({ content: 'The verified role no longer exists. Contact staff.', flags: MessageFlags.Ephemeral });

    if (member.roles.cache.has(verifyRole.id)) {
        return interaction.reply({ content: 'You are already verified.', flags: MessageFlags.Ephemeral });
    }

    try {
        await member.roles.add(verifyRole, 'User verified');
        if (config.unverifiedRoleId && member.roles.cache.has(config.unverifiedRoleId)) {
            await member.roles.remove(config.unverifiedRoleId, 'User verified').catch(() => {});
        }
    } catch {
        return interaction.reply({ content: 'I could not assign the verified role. My role may be too low. Contact staff.', flags: MessageFlags.Ephemeral });
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Verified\nWelcome to **${guild.name}**! You now have access.`));
    return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
}

async function handleUnlock(interaction) {
    const guild = interaction.guild;
    const member = interaction.member;

    if (!isStaff(member)) {
        return interaction.reply({ content: 'You need **Manage Server** permission to unlock.', flags: MessageFlags.Ephemeral });
    }

    const config = await RaidConfig.findOne({ where: { guildId: guild.id } });
    if (!config || !config.lockdownActive) {
        return interaction.reply({ content: 'The server is not in lockdown.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();
    const unlocked = await removeLockdown(guild);
    config.lockdownActive = false;
    await config.save();

    try { require('../antiraid/antiraidEvents').invalidate(guild.id); } catch { }

    logRaidEvent(guild, config, 'Lockdown Lifted', `**By:** <@${member.id}>\n**Channels unlocked:** ${unlocked}`).catch(() => {});

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Lockdown Lifted\nUnlocked **${unlocked}** channels by <@${member.id}>.`));
    return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
}

module.exports = { handle };
