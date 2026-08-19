
module.exports = {
    name: 'rename',
    description: 'Rename the current ticket',
    async execute(message, args) {
        const subcommand = require('../../hybrid/ticket/subcommands/rename');
        return subcommand.execute(message, args);
    }
};
