


const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../config');
const { toggleAdminLock } = require('../../utils/adminLock');

module.exports = {
    name: 'adminlock',
    description: 'Lock all commands for non-owners',
    aliases: ['alock'],
    ownerOnly: true,

    async execute(message, args) {
        if (!config.isOwner(message.author.id)) return;

        const newState = toggleAdminLock();

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Admin Lock — ${newState ? 'Enabled' : 'Disabled'}**`)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    newState
                        ? '> All commands are locked for non-owners.'
                        : '> All commands are accessible to everyone.'
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Admin restricted access | astryx`)
            );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
