
const { RoleConfig } = require('../../../../database/models');
const { isStaff, reply, canManageRole } = require('../../../utils/roleUtils');

module.exports = {
    name: 'autorole',
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const isSlash = interactionOrMessage.isCommand?.();
        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Roles** permission to do that.');

        let action, role;
        if (isSlash) {
            action = interactionOrMessage.options.getString('action');
            role = interactionOrMessage.options.getRole('role');
        } else {
            action = args[0]?.toLowerCase();
            role = interactionOrMessage.mentions.roles.first();
        }

        const [config] = await RoleConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });
        const autoRoles = JSON.parse(config.autoRoleIds || '[]');

        if (action === 'list') {
            if (!autoRoles.length) return reply(interactionOrMessage, 'No auto-roles configured.');
            return reply(interactionOrMessage, '**Auto-roles (added on join):**\n' + autoRoles.map(id => `<@&${id}>`).join('\n'));
        }

        if (action === 'add') {
            if (!role) return reply(interactionOrMessage, 'Provide a role to add.');
            if (!canManageRole(guild, role)) return reply(interactionOrMessage, `I can't manage <@&${role.id}>. Move my role above it.`);
            if (autoRoles.includes(role.id)) return reply(interactionOrMessage, 'That role is already an auto-role.');
            if (autoRoles.length >= 10) return reply(interactionOrMessage, 'Max 10 auto-roles.');
            autoRoles.push(role.id);
            config.autoRoleIds = JSON.stringify(autoRoles);
            await config.save();
            return reply(interactionOrMessage, `Added <@&${role.id}> as an auto-role.`);
        }

        if (action === 'remove') {
            if (!role) return reply(interactionOrMessage, 'Provide a role to remove.');
            const filtered = autoRoles.filter(id => id !== role.id);
            if (filtered.length === autoRoles.length) return reply(interactionOrMessage, 'That role is not an auto-role.');
            config.autoRoleIds = JSON.stringify(filtered);
            await config.save();
            return reply(interactionOrMessage, `Removed <@&${role.id}> from auto-roles.`);
        }

        return reply(interactionOrMessage, 'Usage: `/roles autorole action:add|remove|list [role:@Role]`');
    }
};
