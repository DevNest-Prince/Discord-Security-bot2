
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { RaidConfig } = require('../../../../database/models');
const { isStaff } = require('../../../utils/raidUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
    name: 'setup',
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const isSlash = interactionOrMessage.isCommand?.();

        if (!isStaff(member)) return reply(interactionOrMessage, 'You need **Manage Server** permission to configure anti-raid.');

        let alertChannel, threshold, window;
        if (isSlash) {
            alertChannel = interactionOrMessage.options.getChannel('alert');
            threshold = interactionOrMessage.options.getInteger('threshold');
            window = interactionOrMessage.options.getInteger('window');
        } else {
            alertChannel = interactionOrMessage.mentions.channels.first();
            const nums = args.filter(a => /^\d+$/.test(a)).map(Number);
            threshold = nums[0];
            window = nums[1];
        }

        if (!alertChannel) return reply(interactionOrMessage, 'Please provide an **alert channel**. Example: `/antiraid setup alert:#staff`');

        const [config] = await RaidConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });
        config.enabled = true;
        config.alertChannelId = alertChannel.id;
        if (!config.logChannelId) config.logChannelId = alertChannel.id;
        if (threshold && threshold > 0) config.joinThreshold = threshold;
        if (window && window > 0) config.joinWindowSec = window;
        await config.save();

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Anti-Raid Enabled'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `**Alert Channel:** <#${config.alertChannelId}>\n` +
                `**Trigger:** ${config.joinThreshold} joins / ${config.joinWindowSec}s\n` +
                `**Action:** Lockdown\n\n` +
                `Use \`antiraid verifysetup\` to add button verification, and \`antiraid antialt\` for account-age filtering.`
            ));
        return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
