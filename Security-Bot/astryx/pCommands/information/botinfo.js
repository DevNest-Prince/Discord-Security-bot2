


const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
}

function formatNumber(n) {
    return n.toLocaleString('en-US');
}

module.exports = {
    name: 'botinfo',
    description: "Shows the bot's info",
    aliases: ['bi'],

    async execute(message) {
        const { client } = message;
        const { version: djsVersion } = require('discord.js');
        const nodeVersion = process.version.replace('v', '');

        const servers = client.guilds.cache.size;
        const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        const commands = (client.prefixCommands?.size || 0) + (client.commands?.size || 0);
        const uptime = formatUptime(client.uptime);
        const avatarURL = client.user.displayAvatarURL({ size: 256 });

        const mem = process.memoryUsage();
        const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(2);
        const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(2);

        const systemInfo =
            `**System Info**\n` +
            `> **discord.js:** [**${djsVersion}**](https://discord.js.org)\n` +
            `> **Node.js:** [**${nodeVersion}**](https://nodejs.org)\n` +
            `> **Heap Usage:** ${heapUsed} MB`;

        const botInfo =
            `**Bot Info**\n` +
            `> **Commands:** ${formatNumber(commands)}\n` +
            `> **Uptime:** ${uptime}\n` +
            `> **Users:** ${formatNumber(users)}\n` +
            `> **Servers:** ${formatNumber(servers)}`;

        const container = new ContainerBuilder()
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(systemInfo)
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(avatarURL)
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(botInfo)
            );

        await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
