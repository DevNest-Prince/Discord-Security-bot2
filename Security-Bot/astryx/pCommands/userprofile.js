


module.exports = {
    name: 'userprofile',
    description: 'Show user profile commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../utils/helpMenu').sendHelp('userprofile', message);
        }
        return require('../utils/helpMenu').sendHelp('userprofile', message);
    }
};
