
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
  name: 'unban',
  description: 'Unban a previously banned user',
  aliases: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Permission Denied', 'You need the **Ban Members** permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Missing Permissions', 'I need the **Ban Members** permission.');

    const userId = args[0];
    if (!userId)
      return modReply(message, 'Missing User ID', 'Please provide the user ID to unban.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      const bannedUser = await message.guild.bans.fetch(userId).catch(() => null);
      if (!bannedUser)
        return modReply(message, 'User Not Banned', 'This user is not banned from the server.');

      await message.guild.members.unban(userId, reason);
      await modReply(message, 'User Unbanned',
        `**User:** ${bannedUser.user.tag}\n**Moderator:** ${message.author.tag}\n**Reason:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to unban this user.' : 'Failed to unban user. Check the user ID.';
      await modReply(message, 'Error', msg);
    }
  },
};
