


const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../config');

module.exports = {
    name: 'reboot',
    description: 'Reboot the bot and reload all commands',
    aliases: ['restart', 'reload'],
    ownerOnly: true,

    async execute(message, args) {
        if (!config.isOwner(message.author.id)) return;

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**Reboot**')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('> Reloading all commands...')
            );

        const sent = await message.reply({
            components: [loadingContainer],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
            fetchReply: true
        });

        try {
            const result = await message.client.reloadAllCommands();

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Reboot**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        result.success
                            ? `> ${result.message}`
                            : `> Failed — ${result.message}`
                    )
                );

            if (!result.success && result.error) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`\`\`\`${result.error.substring(0, 500)}\`\`\``)
                );
            }

            container
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Admin restricted access | astryx')
                );

            await sent.edit({
                content: null,
                components: [container],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
            });
        } catch (error) {
            await sent.edit({
                content: `**Error**: ${error.message}`,
                components: []
            });
        }
    }
};
