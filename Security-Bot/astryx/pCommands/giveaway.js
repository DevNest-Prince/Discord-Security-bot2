


module.exports = {
    name: 'giveaway',
    description: 'Show giveaway commands',
    aliases: ['gw'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../utils/helpMenu').sendHelp('giveaway', message);
        }
        const hybrid = require('../hybrid/giveaway/giveaway');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../utils/helpMenu').sendHelp('giveaway', message);
    }
};
