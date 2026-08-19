


module.exports = {
    name: 'vanity',
    description: 'Show vanity roles commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../utils/helpMenu').sendHelp('vanity', message);
        }
        const hybrid = require('../hybrid/vanityroles/vanityroles');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../utils/helpMenu').sendHelp('vanity', message);
    }
};
