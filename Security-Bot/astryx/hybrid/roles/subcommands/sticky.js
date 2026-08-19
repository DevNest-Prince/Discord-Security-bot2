
const { RoleConfig } = require('../../../../database/models');
const { isStaff, reply } = require('../../../utils/roleUtils');

module.exports = {
    name: 'sticky',
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const isSlash = interactionOrMessage.isCommand?.();
        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Roles** permission to do that.');

        const action = isSlash ? interactionOrMessage.options.getString('action') : args[0]?.toLowerCase();

        const [config] = await RoleConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });

        if (action === 'enable') {
            config.stickyEnabled = true;
            await config.save();
            return reply(interactionOrMessage, 'Sticky roles **enabled**. Members who leave and rejoin will get their roles back.');
        }
        if (action === 'disable') {
            config.stickyEnabled = false;
            await config.save();
            return reply(interactionOrMessage, 'Sticky roles **disabled**.');
        }
        return reply(interactionOrMessage, 'Usage: `/roles sticky action:enable|disable`');
    }
};
