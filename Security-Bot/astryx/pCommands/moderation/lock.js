
const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');

function modReply(message, title, body) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'lock',
  description: 'Prevent messages in a channel',
  aliases: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(message, 'Permission Denied', 'You need the **Manage Channels** permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(message, 'Missing Permissions', 'I need the **Manage Channels** permission.');

    const channel = message.mentions.channels.first() || message.channel;
    const reason = args.filter(arg => !arg.startsWith('<#')).join(' ') || 'No reason provided';

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }, { reason });
      await modReply(message, 'Channel Locked',
        `**Channel:** ${channel}\n**Locked by:** ${message.author.tag}\n**Reason:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to modify this channel.' : 'Failed to lock channel.';
      await modReply(message, 'Error', msg);
    }
  },
};
