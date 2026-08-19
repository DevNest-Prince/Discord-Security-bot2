


const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const { AFK } = require('../../../database/models');
const emojis = require('../../emojis.json');

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 > 1 ? 's' : ''}`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}`);
    if (seconds % 60 > 0) parts.push(`${seconds % 60} second${seconds % 60 > 1 ? 's' : ''}`);

    return parts.join(', ') || '0 seconds';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set yourself as AFK with a reason')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for being AFK')
                .setRequired(true)),

    async execute(interaction) {
        const reason = interaction.options.getString('reason');

        if (reason.toLowerCase().includes('discord.gg') || reason.toLowerCase().includes('gg/')) {
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} **Invalid Reason**`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`No invite links allowed.`)
                );

            return interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const existingAFK = await AFK.findOne({
            where: {
                guildId: interaction.guildId,
                userId: interaction.user.id
            }
        });

        if (existingAFK) {
            const alreadyAFKContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} **Already AFK**`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Reason:** ${existingAFK.reason}\n**Since:** <t:${Math.round(existingAFK.time / 1000)}:R>`)
                );

            return interaction.reply({
                components: [alreadyAFKContainer],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const yesButton = new ButtonBuilder()
            .setCustomId('afk_yes')
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success);

        const noButton = new ButtonBuilder()
            .setCustomId('afk_no')
            .setLabel('No')
            .setStyle(ButtonStyle.Danger);

        const buttonRow = new ActionRowBuilder().addComponents(yesButton, noButton);

        const promptContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**DM when mentioned?**`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(buttonRow);

        const message = await interaction.reply({
            components: [promptContainer],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
            fetchReply: true
        });

        try {
            const buttonInteraction = await message.awaitMessageComponent({
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000,
                componentType: ComponentType.Button
            });

            const dmStatus = buttonInteraction.customId === 'afk_yes';
            const currentTime = Date.now();

            await AFK.create({
                guildId: interaction.guildId,
                userId: interaction.user.id,
                reason: reason,
                time: currentTime,
                dm: dmStatus
            });

            const successContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.success} **AFK Set**`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`- **Reason:** ${reason}\n- **DM:** ${dmStatus ? 'Yes' : 'No'}`)
                );

            await buttonInteraction.update({
                components: [successContainer],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
            });
        } catch (error) {
            const timeoutContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} **Timed Out**`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Run command again.`)
                );

            await interaction.editReply({
                components: [timeoutContainer],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
            });
        }
    }
};
