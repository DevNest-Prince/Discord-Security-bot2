
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { TicketConfig, Ticket } = require('../../../../database/models');
const { logTicketEvent, hasSupportRole } = require('../../../utils/ticketUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

function replyTitled(ctx, title, body) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

module.exports = {
    async execute(interactionOrMessage, args) {
        const guild = interactionOrMessage.guild;
        const channel = interactionOrMessage.channel;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const isSlash = interactionOrMessage.isCommand?.();

        let newNameInput;
        if (isSlash) {
            newNameInput = interactionOrMessage.options.getString('name');
        } else {
            if (!args[0]) return reply(interactionOrMessage, 'Please specify a new name.\n**Usage:** `ticket rename <new-name>`');
            newNameInput = args.join(' ');
        }

        const [ticket, config] = await Promise.all([
            Ticket.findOne({ where: { channelId: channel.id } }),
            TicketConfig.findOne({ where: { guildId: guild.id } })
        ]);
        if (!ticket) return reply(interactionOrMessage, 'This channel is not a valid ticket channel.');
        if (!config) return reply(interactionOrMessage, 'Ticket system is not configured.');

        const member = guild.members.cache.get(userId);
        if (!hasSupportRole(member, config)) {
            return reply(interactionOrMessage, 'Only support staff can rename tickets.');
        }

        try {
            const newName = newNameInput.toLowerCase()
                .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                .replace(/--+/g, '-').replace(/^-|-$/g, '')
                .substring(0, 100);

            if (!newName) return reply(interactionOrMessage, 'Invalid name. Use letters, numbers, and hyphens only.');
            if (channel.name === newName) return reply(interactionOrMessage, 'The new name is the same as the current name.');

            const oldName = channel.name;
            const user = interactionOrMessage.user || interactionOrMessage.author;
            await channel.setName(newName, `Ticket renamed by ${user.tag}`);

            logTicketEvent(guild, config, 'Ticket Renamed', `**Ticket:** <#${channel.id}>\n**Old Name:** ${oldName}\n**New Name:** ${newName}\n**Renamed by:** <@${userId}>`).catch(() => {});

            return replyTitled(interactionOrMessage, '### Ticket Renamed', `This ticket has been renamed to \`${newName}\``);
        } catch (error) {
            console.error('Ticket rename error:', error);
            let msg = 'Failed to rename the ticket channel.';
            if (error.code === 50013) msg = 'Missing permissions to rename.';
            else if (error.code === 50029) msg = 'Rate limit reached. Please wait before renaming again.';
            return reply(interactionOrMessage, msg);
        }
    }
};
