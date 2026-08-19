
module.exports = {
    name: 'transcript',
    description: 'Send the current ticket transcript',
    async execute(message, args) {
        const subcommand = require('../../hybrid/ticket/subcommands/transcript');
        return subcommand.execute(message, args);
    }
};
