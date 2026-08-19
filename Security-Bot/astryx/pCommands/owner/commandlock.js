


const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../config');
const commandLockDb = require('../../../database/commandLock');

module.exports = {
    name: 'commandlock',
    description: 'Lock a specific command for normal users',
    aliases: ['cmdlock', 'lockcommand', 'lockcmd'],
    ownerOnly: true,

    async execute(message, args) {
        if (!config.isOwner(message.author.id)) return;

        if (!args.length) {
            const lockedCommands = await commandLockDb.getAllLocked();

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Command Lock**')
                );

            if (lockedCommands.length === 0) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '> No commands are currently locked.\n' +
                        `> Usage: \`${config.PREFIX} commandlock <command>\``
                    )
                );
            } else {
                const list = lockedCommands.map((cmd, idx) =>
                    `- **${cmd.command_name}** — locked <t:${Math.floor(cmd.locked_at / 1000)}:R>`
                ).join('\n');
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> Locked (${lockedCommands.length})\n${list}`)
                );
            }

            container
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Admin restricted access | astryx')
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const commandName = args[0].toLowerCase();
        const slashCommand = message.client.commands.get(commandName);
        const prefixCommand = message.client.prefixCommands.get(commandName);

        if (!slashCommand && !prefixCommand) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Command Lock**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> Command **${commandName}** not found.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Admin restricted access | astryx')
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const actualName = slashCommand ? slashCommand.data.name : prefixCommand.name;

        if (await commandLockDb.isLocked(actualName)) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Command Lock**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> **${actualName}** is already locked.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Admin restricted access | astryx')
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        await commandLockDb.lock(actualName, message.author.id);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**Command Lock**')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`> **${actualName}** has been locked.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Admin restricted access | astryx')
            );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
