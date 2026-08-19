


const botLogger = require('../utils/botLogger');

module.exports = {
    name: 'guildDelete',

    async execute(guild, client) {
        botLogger.logGuildLeave(guild, client).catch(() => {});
    }
};
