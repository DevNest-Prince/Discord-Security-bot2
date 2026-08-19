


module.exports = {
    name: 'reactionroles',
    description: 'Show reaction roles commands',
    aliases: ['rr'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../utils/helpMenu').sendHelp('reactionroles', message);
        }
        const hybrid = require('../hybrid/reactionroles/reactionroles');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../utils/helpMenu').sendHelp('reactionroles', message);
    }
};
