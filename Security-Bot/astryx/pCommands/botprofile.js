


module.exports = {
    name: 'botprofile',
    description: 'Show bot profile commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../utils/helpMenu').sendHelp('botprofile', message);
        }
        return require('../utils/helpMenu').sendHelp('botprofile', message);
    }
};
