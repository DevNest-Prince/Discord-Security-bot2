
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
  name: 'softban',
  description: 'Softban users from the server (ban then unban to delete messages)',
  aliases: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Permission Denied', 'You need the **Ban Members** permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Missing Permissions', 'I need the **Ban Members** permission.');

    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();

    if (!targetUser)
      return modReply(message, 'User Not Found', 'Please mention a user to softban.');

    if (targetMember && targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Cannot Softban User', 'They have an equal or higher role than you.');

    if (targetMember && !targetMember.bannable)
      return modReply(message, 'Cannot Softban User', 'I cannot softban this user. They may have a higher role than me.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await message.guild.members.ban(targetUser, { deleteMessageDays: 1, reason: `[SOFTBAN] ${reason}` });
      await message.guild.members.unban(targetUser, 'Softban - Auto unban');
      await modReply(message, 'User Softbanned',
        `**User:** ${targetUser.tag}\n**Moderator:** ${message.author.tag}\n**Reason:** ${reason}\n**Messages Deleted:** Last 1 day(s)`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to softban this user.' : 'Failed to softban user.';
      await modReply(message, 'Error', msg);
    }
  },
};
