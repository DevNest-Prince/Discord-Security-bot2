


const {
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');
const { TempChannel } = require('../../database/models');
const emojis = require('../emojis.json');

class VoiceControlView {
    static getComponents() {
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('j2c_lock')
                    .setEmoji(emojis.j2c_lock)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_unlock')
                    .setEmoji(emojis.j2c_unlock)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_hide')
                    .setEmoji(emojis.j2c_hide)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_unhide')
                    .setEmoji(emojis.j2c_unhide)
                    .setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('j2c_claim')
                    .setEmoji(emojis.j2c_claim)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_disconnect')
                    .setEmoji(emojis.j2c_disconnect)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_activity')
                    .setEmoji(emojis.j2c_activity)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_info')
                    .setEmoji(emojis.j2c_info)
                    .setStyle(ButtonStyle.Secondary)
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('j2c_increase')
                    .setEmoji(emojis.j2c_increase)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_decrease')
                    .setEmoji(emojis.j2c_decrease)
                    .setStyle(ButtonStyle.Secondary)
            );

        return [row1, row2, row3];
    }

    static async getUserTempVC(userId, guildId, client) {
        const tempChannel = await TempChannel.findOne({
            where: { guildId, ownerId: userId },
            raw: true
        });

        if (tempChannel) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                try {
                    return await guild.channels.fetch(tempChannel.channelId);
                } catch (err) {
                    console.error('Error fetching temp channel:', err);
                    return null;
                }
            }
        }
        return null;
    }

    static async handleButton(interaction) {
        const { customId, user, guild, client } = interaction;
        const member = interaction.member;

        let vc = await VoiceControlView.getUserTempVC(user.id, guild.id, client);


        if (!vc && member.voice && member.voice.channel) {
            const tempChannel = await TempChannel.findOne({
                where: { guildId: guild.id, channelId: member.voice.channel.id },
                raw: true
            });

            if (tempChannel && tempChannel.ownerId === user.id) {
                vc = member.voice.channel;
            }
        }

        if (!vc && !['j2c_claim'].includes(customId)) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("You don't own a voice channel!")
                );
            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        switch (customId) {
            case 'j2c_lock':
                await interaction.deferReply({ ephemeral: true });
                try {
                    await vc.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Locked ${vc.name}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Failed to lock the channel.' });
                }
                break;

            case 'j2c_unlock':
                await interaction.deferReply({ ephemeral: true });
                try {
                    await vc.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Unlocked ${vc.name}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Failed to unlock the channel.' });
                }
                break;

            case 'j2c_hide':
                await interaction.deferReply({ ephemeral: true });
                try {
                    await vc.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Hidden ${vc.name}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Failed to hide the channel.' });
                }
                break;

            case 'j2c_unhide':
                await interaction.deferReply({ ephemeral: true });
                try {
                    await vc.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Revealed ${vc.name}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Failed to reveal the channel.' });
                }
                break;

            case 'j2c_claim':
                if (!member.voice || !member.voice.channel) {
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("You need to be in a voice channel!")
                        );
                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }

                const claimVC = member.voice.channel;
                const tempChannelRecordData = await TempChannel.findOne({
                    where: { guildId: guild.id, channelId: claimVC.id },
                    raw: true
                });

                if (!tempChannelRecordData) {
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("This is not a temporary voice channel!")
                        );
                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }

                const currentOwner = guild.members.cache.get(tempChannelRecordData.ownerId);
                if (currentOwner && claimVC.members.has(currentOwner.id)) {
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("The owner is still in the channel!")
                        );
                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }

                await interaction.deferReply({ ephemeral: true });
                try {
                    await TempChannel.update(
                        { ownerId: user.id },
                        { where: { channelId: claimVC.id } }
                    );
                    await claimVC.edit({ name: `${user.displayName}'s VC` });
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`You claimed ${claimVC.name}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Failed to claim the channel.' });
                }
                break;

            case 'j2c_disconnect':
                if (vc.members.size <= 1) {
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("No one to disconnect!")
                        );
                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }

                const { StringSelectMenuBuilder } = require('discord.js');
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('j2c_dc_select')
                    .setPlaceholder('Select a member to disconnect')
                    .addOptions(
                        vc.members
                            .filter(m => m.id !== user.id)
                            .map(m => ({
                                label: m.displayName,
                                value: m.id
                            }))
                            .slice(0, 25)
                    );

                const disconnectContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Disconnect Member**\n\nSelect a member to disconnect from your voice channel:')
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(selectMenu)
                    );

                await interaction.reply({
                    components: [disconnectContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
                break;

            case 'j2c_activity':
                await interaction.deferReply({ ephemeral: true });
                const activityContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("**Voice Activities**\n\nRight-click the voice channel and select 'Activities' to start one!")
                    );
                await interaction.editReply({
                    components: [activityContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                break;

            case 'j2c_info':
                await interaction.deferReply({ ephemeral: true });
                const infoContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**${vc.name}**\n\n` +
                            `**Members:** ${vc.members.size}\n` +
                            `**Limit:** ${vc.userLimit || 'Unlimited'}\n` +
                            `**Bitrate:** ${vc.bitrate / 1000}kbps`
                        )
                    );
                await interaction.editReply({
                    components: [infoContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                break;

            case 'j2c_increase':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const newLimit = Math.min((vc.userLimit || 0) + 1, 99);
                    await vc.edit({ userLimit: newLimit });
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`User limit increased to ${newLimit}`)
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Failed to increase user limit.' });
                }
                break;

            case 'j2c_decrease':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const current = vc.userLimit || 1;
                    const newLimit = Math.max(current - 1, 0);
                    await vc.edit({ userLimit: newLimit || null });
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                newLimit === 0 ? 'User limit removed' : `User limit decreased to ${newLimit}`
                            )
                        );
                    await interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {
                    await interaction.editReply({ content: 'Failed to decrease user limit.' });
                }
                break;
        }
    }
}

module.exports = VoiceControlView;
