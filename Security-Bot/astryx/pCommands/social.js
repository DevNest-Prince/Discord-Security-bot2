


module.exports = {
    name: 'social',
    description: 'Show social commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../utils/helpMenu').sendHelp('social', message);
        }
        return require('../utils/helpMenu').sendHelp('social', message);
    }
};
