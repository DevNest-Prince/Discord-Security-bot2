
module.exports = {
    name: 'transfer',
    description: 'Transfer the current ticket to another staff member',
    async execute(message, args) {
        const subcommand = require('../../hybrid/ticket/subcommands/transfer');
        return subcommand.execute(message, args);
    }
};
