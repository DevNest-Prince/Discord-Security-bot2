
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage the ticket system')
        .addSubcommand(sub => sub.setName('setup').setDescription('Setup the ticket system for your server'))
        .addSubcommand(sub => sub.setName('panel').setDescription('Send a new ticket panel to the configured channel'))
        .addSubcommand(sub => sub.setName('close').setDescription('Close the current ticket').addStringOption(o => o.setName('reason').setDescription('Reason for closing')))
        .addSubcommand(sub => sub.setName('open').setDescription('Reopen a closed ticket'))
        .addSubcommand(sub => sub.setName('delete').setDescription('Delete a ticket channel').addChannelOption(o => o.setName('channel').setDescription('Ticket channel to delete')))
        .addSubcommand(sub => sub.setName('add').setDescription('Add a user to the current ticket').addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true)))
        .addSubcommand(sub => sub.setName('rename').setDescription('Rename the current ticket channel').addStringOption(o => o.setName('name').setDescription('New name').setRequired(true)))
        .addSubcommand(sub => sub.setName('claim').setDescription('Claim the current ticket'))
        .addSubcommand(sub => sub.setName('addcategory').setDescription('Add a new ticket category'))
        .addSubcommand(sub => sub.setName('addrole').setDescription('Add an additional support role').addRoleOption(o => o.setName('role').setDescription('Role to add as support').setRequired(true)))
        .addSubcommand(sub => sub.setName('removerole').setDescription('Remove a support role').addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)))
        .addSubcommand(sub => sub.setName('reset').setDescription('Reset the entire ticket system configuration'))
        .addSubcommand(sub => sub.setName('transcript').setDescription('Send the current ticket transcript to the creator and log channel'))
        .addSubcommand(sub => sub.setName('removecategory').setDescription('Remove a ticket category'))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove a user from the current ticket').addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)))
        .addSubcommand(sub => sub.setName('transfer').setDescription('Transfer a claimed ticket to another staff member').addUserOption(o => o.setName('user').setDescription('Staff member to transfer to').setRequired(true))),

    name: 'ticket',
    aliases: ['tickets'],
    category: 'utility',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        const validSubs = ['setup', 'panel', 'close', 'open', 'delete', 'add', 'remove', 'rename', 'claim', 'transfer', 'addcategory', 'removecategory', 'addrole', 'removerole', 'reset', 'transcript', 'sendpanel', 'del', 'reopen', 'shut', 'end', 'mv', 'name', 'delcat', 'rmcat', 'kick'];

        if (!subcommand || !validSubs.includes(subcommand)) {
            return require('../../utils/helpMenu').sendHelp('tickets', interactionOrMessage);
        }

        const aliasMap = { sendpanel: 'panel', del: 'delete', reopen: 'open', shut: 'close', end: 'close', mv: 'rename', name: 'rename', delcat: 'removecategory', rmcat: 'removecategory', kick: 'remove' };
        const resolved = aliasMap[subcommand] || subcommand;

        const subcommandFile = require(`./subcommands/${resolved}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
