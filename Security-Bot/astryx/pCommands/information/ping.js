


const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const sequelize = require('../../../database/sequelize');

module.exports = {
    name: 'ping',
    description: 'Check the bot\'s latency',

    async execute(message) {
        const sent = await message.reply({ content: 'Pinging...', fetchReply: true });

        const wsLatency = message.client.ws.ping;
        const roundTrip = sent.createdTimestamp - message.createdTimestamp;

        const dbStart = Date.now();
        try { await sequelize.query('SELECT 1'); } catch (_) {}
        const dbLatency = Date.now() - dbStart;

        const avg = Math.round((wsLatency + dbLatency) / 2);

        const ansi = [
            '```ansi',
            '\u001b[1;35mLatency\u001b[0m',
            `\u001b[1;36mWebsocket        :: ${wsLatency} MS\u001b[0m`,
            `\u001b[1;36mDatabase         :: ${dbLatency} MS\u001b[0m`,
            `\u001b[1;36mAverage Latency  :: ${avg} MS\u001b[0m`,
            '```'
        ].join('\n');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(ansi)
            );

        await sent.edit({
            content: null,
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    },
};
