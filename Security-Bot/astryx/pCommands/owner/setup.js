const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ChannelType } = require('discord.js');
const config = require('../../config');
const logsConfig = require('../../config.logs');

module.exports = {
    name: 'setup',
    description: 'Setup webhook logs for the bot (creates logging channels and webhooks)',
    aliases: ['setuplogging', 'webhooksetup'],
    ownerOnly: true,

    async execute(message, args) {
        if (!config.isOwner(message.author.id)) return;

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**Webhook Setup**')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('> Setting up logging webhooks...')
            );

        const sent = await message.reply({
            components: [loadingContainer],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });

        try {
            const guild = message.guild;
            if (!guild) throw new Error('This command can only be used in a server');

            const botMember = await guild.members.fetchMe();
            if (!botMember.permissions.has('ManageWebhooks') || !botMember.permissions.has('ManageChannels')) {
                throw new Error('Bot needs ManageWebhooks and ManageChannels permissions');
            }

            const loggingCategory = await guild.channels.create({
                name: 'astryx-logging',
                type: ChannelType.GuildCategory,
                reason: 'astryx bot logging setup'
            });

            const webhooks = {};
            const webhookTypes = [
                { name: 'join-logs', displayName: 'Join Logs' },
                { name: 'leave-logs', displayName: 'Leave Logs' },
                { name: 'slash-logs', displayName: 'Slash Logs' },
                { name: 'prefix-logs', displayName: 'Prefix Logs' },
                { name: 'error-logs', displayName: 'Error Logs' },
                { name: 'dm-logs', displayName: 'DM Logs' }
            ];

            for (const webhook of webhookTypes) {
                const channel = await guild.channels.create({
                    name: webhook.name,
                    parent: loggingCategory,
                    reason: `astryx bot ${webhook.displayName} setup`
                });

                const createdWebhook = await channel.createWebhook({
                    name: `astryx-${webhook.name}`,
                    reason: `astryx bot ${webhook.displayName} webhook`
                });

                webhooks[webhook.name] = {
                    url: createdWebhook.url,
                    displayName: webhook.displayName
                };
            }

            // Persist the URLs to .env AND apply them live so logging works immediately (no restart).
            logsConfig.applyWebhookUrls({
                JOIN_LOGS: webhooks['join-logs'].url,
                LEAVE_LOGS: webhooks['leave-logs'].url,
                SLASH_LOGS: webhooks['slash-logs'].url,
                PREFIX_LOGS: webhooks['prefix-logs'].url,
                ERROR_LOGS: webhooks['error-logs'].url,
                DM_LOGS: webhooks['dm-logs'].url
            });

            const setupResults = [];
            for (const [name, webhook] of Object.entries(webhooks)) {
                setupResults.push(`✅ ${webhook.displayName}: ${webhook.url.substring(0, 50)}...`);
            }

            const resultContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Webhook Setup**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('> ✅ Created all logging webhooks, saved them to `.env`, and applied them live.')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`\`\`\`\n${setupResults.join('\n')}\n\`\`\``)
                );

            resultContainer
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Admin restricted access | astryx')
                );

            await sent.edit({
                content: null,
                components: [resultContainer],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Setup error:', error);
            await sent.edit({
                content: `**Setup Error**: ${error.message}`,
                components: []
            });
        }
    }
};
