
module.exports = {
    name: 'close',
    description: 'Close the current ticket',
    async execute(message, args) {
        const subcommand = require('../../hybrid/ticket/subcommands/close');
        return subcommand.execute(message, args);
    }
};
