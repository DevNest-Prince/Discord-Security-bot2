
const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const ms = require('ms');

function modReply(message, title, body) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'mute',
  description: 'Mute users for a duration',
  aliases: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Permission Denied', 'You need the **Moderate Members** permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Missing Permissions', 'I need the **Moderate Members** permission.');

    const targetMember = message.mentions.members.first();
    if (!targetMember)
      return modReply(message, 'User Not Found', 'Please mention a user to mute.');

    const duration = args[1];
    if (!duration)
      return modReply(message, 'Missing Duration', 'Please provide a duration (e.g., 1h, 30m, 1d).');

    const time = ms(duration);
    if (!time || time < 1000 || time > 2419200000)
      return modReply(message, 'Invalid Duration', 'Provide a valid duration (e.g., 1h, 30m, 1d). Maximum is 28 days.');

    if (targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Cannot Mute User', 'They have an equal or higher role than you.');

    if (!targetMember.moderatable)
      return modReply(message, 'Cannot Mute User', 'I cannot mute this user. They may have a higher role than me.');

    const reason = args.slice(2).join(' ') || 'No reason provided';

    try {
      await targetMember.timeout(time, reason);
      await modReply(message, 'User Muted',
        `**User:** ${targetMember.user}\n**Duration:** ${ms(time, { long: true })}\n**Moderator:** ${message.author.tag}\n**Reason:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to mute this user.' : 'Failed to mute user.';
      await modReply(message, 'Error', msg);
    }
  },
};
