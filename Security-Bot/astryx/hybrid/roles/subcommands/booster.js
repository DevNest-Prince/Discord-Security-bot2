
const { RoleConfig } = require('../../../../database/models');
const { isStaff, reply, canManageRole } = require('../../../utils/roleUtils');

module.exports = {
    name: 'booster',
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

        if (action === 'set') {
            if (!role) return reply(interactionOrMessage, 'Provide the booster perk role.');
            if (!canManageRole(guild, role)) return reply(interactionOrMessage, `I can't manage <@&${role.id}>. Move my role above it.`);
            config.boosterRoleId = role.id;
            await config.save();
            return reply(interactionOrMessage, `Booster perk role set to <@&${role.id}>. Boosters get it automatically; it's removed when they stop boosting.`);
        }

        if (action === 'remove') {
            config.boosterRoleId = null;
            await config.save();
            return reply(interactionOrMessage, 'Booster perk role cleared.');
        }

        return reply(interactionOrMessage, 'Usage: `/roles booster action:set|remove [role:@Role]`');
    }
};
