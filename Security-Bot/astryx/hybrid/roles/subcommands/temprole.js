
const { TempRole } = require('../../../../database/models');
const { isStaff, reply, canManageRole, parseDuration, formatDuration } = require('../../../utils/roleUtils');

module.exports = {
    name: 'temprole',
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const isSlash = interactionOrMessage.isCommand?.();
        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Roles** permission to do that.');

        let target, role, durationStr;
        if (isSlash) {
            target = interactionOrMessage.options.getMember('user');
            role = interactionOrMessage.options.getRole('role');
            durationStr = interactionOrMessage.options.getString('duration');
        } else {
            target = interactionOrMessage.mentions.members.first();
            role = interactionOrMessage.mentions.roles.first();
            durationStr = args[args.length - 1];
        }

        if (!target || !role || !durationStr) return reply(interactionOrMessage, 'Usage: `/roles temprole user:@User role:@Role duration:2h`');

        const ms = parseDuration(durationStr);
        if (!ms) return reply(interactionOrMessage, 'Invalid duration. Use formats like `10m`, `2h`, `7d`, `1w`.');
        if (ms > 604800000 * 8) return reply(interactionOrMessage, 'Duration too long (max ~8 weeks).');

        if (!canManageRole(guild, role)) return reply(interactionOrMessage, `I can't manage <@&${role.id}>. Move my role above it and make sure it isn't managed.`);

        try {
            await target.roles.add(role, `Temp role for ${formatDuration(ms)}`);
        } catch {
            return reply(interactionOrMessage, 'Failed to add the role. Check my permissions and role position.');
        }

        const expiresAt = new Date(Date.now() + ms);
        // Replace any existing timer for the same user+role.
        await TempRole.destroy({ where: { guildId: guild.id, userId: target.id, roleId: role.id } });
        await TempRole.create({ guildId: guild.id, userId: target.id, roleId: role.id, expiresAt });

        return reply(interactionOrMessage, `Gave <@&${role.id}> to <@${target.id}> for **${formatDuration(ms)}** (removed <t:${Math.floor(expiresAt.getTime() / 1000)}:R>).`);
    }
};
