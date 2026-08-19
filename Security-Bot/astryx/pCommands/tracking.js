


module.exports = {
    name: 'tracking',
    description: 'Show tracking commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../utils/helpMenu').sendHelp('tracking', message);
        }
        return require('../utils/helpMenu').sendHelp('tracking', message);
    }
};
