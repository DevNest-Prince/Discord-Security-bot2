


const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { NoPrefix } = require('../../../database/models');
const config = require('../../config');
const ms = require('ms');

module.exports = {
    name: 'noprefix',
    description: 'Add or remove a user from the no-prefix system',
    usage: 'noprefix add <user> <duration> | noprefix remove <user> | noprefix list',
    category: 'owner',
    ownerOnly: true,

    async execute(message, args) {
        const action = args[0]?.toLowerCase();

        const footer = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true);
        const footerText = new TextDisplayBuilder().setContent('-# Admin restricted access | astryx');

        if (action === 'add') {
            const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[1]).catch(() => null);
            if (!targetUser) return message.reply('Please mention a user or provide a valid user ID.');

            const durationStr = args[2] || 'permanent';
            let expiresAt = null;
            if (durationStr !== 'permanent') {
                const durationMs = ms(durationStr);
                if (!durationMs) return message.reply('Invalid duration. Use formats like 1h, 7d, or permanent.');
                expiresAt = new Date(Date.now() + durationMs);
            }

            await NoPrefix.upsert({
                userId: targetUser.id,
                username: targetUser.username,
                grantedBy: message.author.id,
                grantedByUsername: message.author.username,
                expiresAt,
                duration: durationStr
            });

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**No-Prefix**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> Granted to **${targetUser.tag}**\n` +
                        `> - Duration: ${durationStr}\n` +
                        `> - Expires: ${expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>` : 'Never'}`
                    )
                )
                .addSeparatorComponents(footer)
                .addTextDisplayComponents(footerText);

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (action === 'remove') {
            const targetUser = message.mentions.users.first() || await message.client.users.fetch(args[1]).catch(() => null);

            if (!targetUser) {
                const record = await NoPrefix.findOne({ where: { userId: args[1] } });
                if (record) {
                    await record.destroy();
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('**No-Prefix**'))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> Removed \`${args[1]}\` from the no-prefix list.`))
                        .addSeparatorComponents(footer)
                        .addTextDisplayComponents(footerText);
                    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }
                return message.reply('User not found in the no-prefix list.');
            }

            const existing = await NoPrefix.findOne({ where: { userId: targetUser.id } });
            if (!existing) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('**No-Prefix**'))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> **${targetUser.tag}** is not in the no-prefix list.`))
                    .addSeparatorComponents(footer)
                    .addTextDisplayComponents(footerText);
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const deletedCount = await NoPrefix.destroy({ where: { userId: targetUser.id } });
            const checkAgain = await NoPrefix.findOne({ where: { userId: targetUser.id } });

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('**No-Prefix**'))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> ${checkAgain ? 'Failed to remove' : 'Removed'} **${targetUser.tag}**\n` +
                        `> - Rows deleted: ${deletedCount}\n` +
                        `> - Status: ${checkAgain ? 'FAILED' : 'Verified'}`
                    )
                )
                .addSeparatorComponents(footer)
                .addTextDisplayComponents(footerText);

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (action === 'list') {
            const records = await NoPrefix.findAll();

            if (records.length === 0) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('**No-Prefix**'))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('> No users in the no-prefix list.'))
                    .addSeparatorComponents(footer)
                    .addTextDisplayComponents(footerText);
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const list = records.map((r, i) => {
                const expiry = r.expiresAt ? `<t:${Math.floor(new Date(r.expiresAt).getTime() / 1000)}:R>` : 'Never';
                return `- **${r.username}** (\`${r.userId}\`) — ${expiry}`;
            }).join('\n');

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('**No-Prefix**'))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> ${records.length} user${records.length !== 1 ? 's' : ''}\n${list}`))
                .addSeparatorComponents(footer)
                .addTextDisplayComponents(footerText);

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('**No-Prefix**'))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> Usage\n` +
                    `> - \`${config.PREFIX} noprefix add <@user/ID> <duration>\`\n` +
                    `> - \`${config.PREFIX} noprefix remove <@user/ID>\`\n` +
                    `> - \`${config.PREFIX} noprefix list\``
                )
            )
            .addSeparatorComponents(footer)
            .addTextDisplayComponents(footerText);

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
