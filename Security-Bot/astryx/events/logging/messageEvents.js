


const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    AttachmentBuilder,
    FileBuilder,
    AuditLogEvent
} = require('discord.js');
const { LoggingConfig, GuildConfig } = require('../../../database/models');
const fsPromises = require('fs').promises;
const path = require('path');

const loggingConfigCache = new Map();
const guildConfigCache = new Map();
const LOGGING_CACHE_TTL = 60000;

async function getLogChannel(client, guildId, type, legacyType = null) {
    try {
        const cachedGC = guildConfigCache.get(guildId);
        let guildConfig;
        if (cachedGC && Date.now() - cachedGC.ts < LOGGING_CACHE_TTL) {
            guildConfig = cachedGC.val;
        } else {
            guildConfig = await GuildConfig.findOne({ where: { guildId } });
            guildConfigCache.set(guildId, { val: guildConfig, ts: Date.now() });
        }
        if (!guildConfig || !guildConfig.loggingEnabled) return null;

        const cachedLC = loggingConfigCache.get(guildId);
        let config;
        if (cachedLC && Date.now() - cachedLC.ts < LOGGING_CACHE_TTL) {
            config = cachedLC.val;
        } else {
            config = await LoggingConfig.findOne({ where: { guildId } });
            loggingConfigCache.set(guildId, { val: config, ts: Date.now() });
        }
        if (!config) return null;


        let channelId = config[`${type}ChannelId`];
        if (!channelId && legacyType) {
            channelId = config[`${legacyType}EventsChannelId`];
        }
        if (!channelId) return null;

        return client.channels.cache.get(channelId);
    } catch (error) {
        return null;
    }
}

function truncateContent(content, maxLength = 1000) {
    if (!content) return 'No content';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
}

module.exports = {
    name: 'messageEvents',

    async init(client) {
        client.on('messageDelete', async (message) => {
            if (!message.guild) return;
            if (message.author?.bot) return;

            const logChannel = await getLogChannel(client, message.guild.id, 'messageLogs', 'message');
            if (!logChannel) return;

            const author = message.author;
            if (!author) return;

            const content = message.content || 'No text content';

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Message Deleted')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `**Channel:** <#${message.channelId}> **ID:** \`${message.channelId}\`\n` +
                                `**Server:** \`${message.guild.name}\`\n` +
                                `**ID:** \`${message.guild.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(author.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`\`\`\`\n${truncateContent(content, 1500)}\n\`\`\``)
                );

            if (message.attachments.size > 0) {
                const attachmentList = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Attachments:**\n${attachmentList}`)
                );
            }

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('messageUpdate', async (oldMessage, newMessage) => {
            if (!newMessage.guild) return;
            if (newMessage.author?.bot) return;
            if (oldMessage.content === newMessage.content) return;

            const logChannel = await getLogChannel(client, newMessage.guild.id, 'messageLogs', 'message');
            if (!logChannel) return;

            const author = newMessage.author;
            if (!author) return;

            const oldContent = oldMessage.content || 'No content';
            const newContent = newMessage.content || 'No content';

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Message Edited')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `**Channel:** <#${newMessage.channelId}> **ID:** \`${newMessage.channelId}\`\n` +
                                `**Server:** \`${newMessage.guild.name}\`\n` +
                                `**ID:** \`${newMessage.guild.id}\`\n` +
                                `[Jump to Message](${newMessage.url})`
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(author.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Before:**\n\`\`\`\n${truncateContent(oldContent, 700)}\n\`\`\``)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**After:**\n\`\`\`\n${truncateContent(newContent, 700)}\n\`\`\``)
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(err => {
                console.error('[LOGGING] Failed to send message edit log:', err.message);
            });
        });

        client.on('messageDeleteBulk', async (messages, channel) => {
            if (!channel.guild) return;

            const logChannel = await getLogChannel(client, channel.guild.id, 'messageLogs', 'message');
            if (!logChannel) return;

            const messageArray = Array.from(messages.values())
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            if (messageArray.length === 0) return;


            let moderator = null;
            try {
                const auditLogs = await channel.guild.fetchAuditLogs({
                    type: AuditLogEvent.MessageBulkDelete,
                    limit: 5
                });

                const now = Date.now();
                const entry = auditLogs.entries.find(e =>
                    (now - e.createdTimestamp) < 5000
                );

                if (entry && entry.executor) {
                    moderator = entry.executor;
                }
            } catch (err) {

            }

            let fileContent = `Bulk Delete Log - ${channel.guild.name}\n`;
            fileContent += `Channel: #${channel.name} (${channel.id})\n`;
            fileContent += `Time: ${new Date().toISOString()}\n`;
            fileContent += `Total Messages Deleted: ${messageArray.length}\n`;
            if (moderator) {
                fileContent += `Executor: ${moderator.tag} (${moderator.id})\n`;
            }
            fileContent += `${'='.repeat(50)}\n\n`;

            for (const msg of messageArray) {
                const author = msg.author ? `${msg.author.username} (${msg.author.id})` : 'Unknown';
                const timestamp = new Date(msg.createdTimestamp).toISOString();
                const content = msg.content || '[No text content]';
                const attachments = msg.attachments.size > 0
                    ? `\nAttachments: ${msg.attachments.map(a => a.url).join(', ')}`
                    : '';

                fileContent += `[${timestamp}] ${author}\n`;
                fileContent += `${content}${attachments}\n`;
                fileContent += `${'-'.repeat(40)}\n`;
            }

            const tmpDir = path.join(__dirname, '../../tmp');
            await fsPromises.mkdir(tmpDir, { recursive: true });

            const filename = `bulk_delete_${channel.guild.id}_${Date.now()}.txt`;
            const filePath = path.join(tmpDir, filename);

            await fsPromises.writeFile(filePath, fileContent);

            try {
                const attachment = new AttachmentBuilder(filePath, { name: filename });

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Bulk Messages Deleted')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**Channel:** <#${channel.id}> **ID:** \`${channel.id}\`\n` +
                            `**Messages Deleted:** \`${messageArray.length}\`\n` +
                            `**Server:** \`${channel.guild.name}\`\n` +
                            `**ID:** \`${channel.guild.id}\`` +
                            (moderator ? `\n**Executor:** ${moderator.tag} (${moderator.id})` : '')
                        )
                    )
                    .addFileComponents(
                        new FileBuilder().setURL(`attachment://${filename}`)
                    );

                await logChannel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    files: [attachment],
                    allowedMentions: { users: [] }
                }).catch(err => {
                    console.error('[LOGGING] Failed to send bulk delete log:', err.message);
                });
            } finally {
                fsPromises.unlink(filePath).catch(err => {
                    console.error('[LOGGING] Failed to cleanup bulk delete log file:', err.message);
                });
            }
        });
    }
};
