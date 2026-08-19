
const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Advanced role management')
        .addSubcommandGroup(g => g.setName('selfrole').setDescription('Self-assignable role menus')
            .addSubcommand(sub => sub.setName('create').setDescription('Create a self-role menu')
                .addChannelOption(o => o.setName('channel').setDescription('Channel to post the menu').setRequired(true))
                .addStringOption(o => o.setName('title').setDescription('Menu title'))
                .addStringOption(o => o.setName('type').setDescription('Menu style').addChoices({ name: 'button', value: 'button' }, { name: 'dropdown', value: 'dropdown' }))
                .addStringOption(o => o.setName('mode').setDescription('toggle = many, single = one').addChoices({ name: 'toggle', value: 'toggle' }, { name: 'single', value: 'single' })))
            .addSubcommand(sub => sub.setName('add').setDescription('Add a role to a self-role menu')
                .addStringOption(o => o.setName('message_id').setDescription('The menu message ID').setRequired(true))
                .addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true))
                .addStringOption(o => o.setName('label').setDescription('Button/option label'))
                .addStringOption(o => o.setName('emoji').setDescription('Emoji'))
                .addStringOption(o => o.setName('description').setDescription('Dropdown description')))
            .addSubcommand(sub => sub.setName('remove').setDescription('Remove a role from a self-role menu')
                .addStringOption(o => o.setName('message_id').setDescription('The menu message ID').setRequired(true))
                .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)))
            .addSubcommand(sub => sub.setName('delete').setDescription('Delete a self-role menu')
                .addStringOption(o => o.setName('message_id').setDescription('The menu message ID').setRequired(true))))
        .addSubcommand(sub => sub.setName('temprole').setDescription('Give a temporary role')
            .addUserOption(o => o.setName('user').setDescription('User to give the role').setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true))
            .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 2h, 7d').setRequired(true)))
        .addSubcommand(sub => sub.setName('autorole').setDescription('Manage roles added on join')
            .addStringOption(o => o.setName('action').setDescription('add | remove | list').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' }))
            .addRoleOption(o => o.setName('role').setDescription('Role (for add/remove)')))
        .addSubcommand(sub => sub.setName('booster').setDescription('Set/remove the booster perk role')
            .addStringOption(o => o.setName('action').setDescription('set | remove').setRequired(true).addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }))
            .addRoleOption(o => o.setName('role').setDescription('Booster role (for set)')))
        .addSubcommand(sub => sub.setName('sticky').setDescription('Enable/disable sticky roles')
            .addStringOption(o => o.setName('action').setDescription('enable | disable').setRequired(true).addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
        .addSubcommand(sub => sub.setName('massrole').setDescription('Add/remove a role for many members')
            .addStringOption(o => o.setName('action').setDescription('add | remove').setRequired(true).addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
            .addRoleOption(o => o.setName('role').setDescription('Role to add/remove').setRequired(true))
            .addStringOption(o => o.setName('target').setDescription('all | humans | bots (default all)').addChoices({ name: 'all', value: 'all' }, { name: 'humans', value: 'humans' }, { name: 'bots', value: 'bots' }))),

    name: 'roles',
    aliases: ['role'],
    category: 'moderation',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand, group;

        if (isSlash) {
            group = interactionOrMessage.options.getSubcommandGroup(false);
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        const routeKey = group ? `${group}_${subcommand}` : subcommand;

        const validSubs = ['selfrole', 'temprole', 'autorole', 'booster', 'sticky', 'massrole'];
        const topLevel = group || subcommand;
        if (!topLevel || !validSubs.includes(topLevel)) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Role Management'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '`selfrole create|add|remove|delete` - Self-assignable role menus\n' +
                    '`temprole <user> <role> <duration>` - Temporary role\n' +
                    '`autorole add|remove|list [role]` - Roles added on join\n' +
                    '`booster set|remove [role]` - Booster perk role\n' +
                    '`sticky enable|disable` - Restore roles on rejoin\n' +
                    '`massrole add|remove <role> [all|humans|bots]` - Bulk role'
                ));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        // Map to subcommand file. selfrole group -> selfrole.js handles its own action.
        const fileName = group === 'selfrole' ? 'selfrole' : subcommand;
        const subcommandFile = require(`./subcommands/${fileName}`);
        return subcommandFile.execute(interactionOrMessage, args, { group, subcommand, routeKey });
    }
};
