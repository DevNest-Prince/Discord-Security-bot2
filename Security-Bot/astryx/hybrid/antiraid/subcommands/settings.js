
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { RaidConfig } = require('../../../../database/models');
const { isStaff } = require('../../../utils/raidUtils');

module.exports = {
    name: 'settings',
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        if (!isStaff(member)) {
            const c = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('You need **Manage Server** permission to do that.'));
            return interactionOrMessage.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const config = await RaidConfig.findOne({ where: { guildId: guild.id } });
        if (!config) {
            const c = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('Anti-raid is not set up. Run `antiraid setup` first.'));
            return interactionOrMessage.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const onOff = v => v ? 'On' : 'Off';
        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Anti-Raid Settings'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `**Enabled:** ${onOff(config.enabled)}\n` +
                `**Trigger:** ${config.joinThreshold} joins / ${config.joinWindowSec}s\n` +
                `**Action:** ${config.action}\n` +
                `**Lockdown Active:** ${onOff(config.lockdownActive)}\n` +
                `**Alert Channel:** ${config.alertChannelId ? `<#${config.alertChannelId}>` : 'None'}\n` +
                `**Anti-Alt (min age):** ${config.minAccountAgeDays > 0 ? `${config.minAccountAgeDays} days` : 'Off'}\n\n` +
                `**Verification:** ${onOff(config.verifyEnabled)}\n` +
                `**Verified Role:** ${config.verifyRoleId ? `<@&${config.verifyRoleId}>` : 'None'}\n` +
                `**Unverified Role:** ${config.unverifiedRoleId ? `<@&${config.unverifiedRoleId}>` : 'None'}\n` +
                `**Verify Channel:** ${config.verifyChannelId ? `<#${config.verifyChannelId}>` : 'None'}`
            ));
        return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
    }
};
