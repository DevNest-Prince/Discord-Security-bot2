
const { isStaff, reply, canManageRole } = require('../../../utils/roleUtils');

module.exports = {
    name: 'massrole',
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const isSlash = interactionOrMessage.isCommand?.();
        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Roles** permission to do that.');

        let action, role, target;
        if (isSlash) {
            action = interactionOrMessage.options.getString('action');
            role = interactionOrMessage.options.getRole('role');
            target = interactionOrMessage.options.getString('target') || 'all';
        } else {
            action = args[0]?.toLowerCase();
            role = interactionOrMessage.mentions.roles.first();
            target = (args.find(a => ['all', 'humans', 'bots'].includes(a?.toLowerCase())) || 'all').toLowerCase();
        }

        if (!['add', 'remove'].includes(action) || !role) return reply(interactionOrMessage, 'Usage: `/roles massrole action:add|remove role:@Role [target:all|humans|bots]`');
        if (!canManageRole(guild, role)) return reply(interactionOrMessage, `I can't manage <@&${role.id}>. Move my role above it.`);

        await reply(interactionOrMessage, `Processing mass-role **${action}** for <@&${role.id}> (target: ${target}). This may take a while...`);

        let members;
        try {
            members = await guild.members.fetch();
        } catch {
            return interactionOrMessage.channel?.send('Failed to fetch members.');
        }

        const filtered = members.filter(m => {
            if (target === 'humans' && m.user.bot) return false;
            if (target === 'bots' && !m.user.bot) return false;
            const has = m.roles.cache.has(role.id);
            return action === 'add' ? !has : has;
        });

        let changed = 0, failed = 0;
        for (const m of filtered.values()) {
            try {
                if (action === 'add') await m.roles.add(role, 'Mass-role');
                else await m.roles.remove(role, 'Mass-role');
                changed++;
            } catch {
                failed++;
            }
        }

        const done = `Mass-role complete. ${action === 'add' ? 'Added to' : 'Removed from'} **${changed}** members${failed ? `, ${failed} failed` : ''}.`;
        return interactionOrMessage.channel?.send(done);
    }
};
