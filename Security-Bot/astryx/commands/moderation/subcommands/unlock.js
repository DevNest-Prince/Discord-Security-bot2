


const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

function modReply(interaction, title, body, ephemeral = false) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral });
}

module.exports = {
  name: 'unlock',
  description: 'Unlock a channel',

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(interaction, 'Permission Denied', 'You need the **Manage Channels** permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(interaction, 'Missing Permissions', 'I need the **Manage Channels** permission.', true);

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      await modReply(interaction, 'Channel Unlocked',
        `**Channel:** ${channel}\n**Unlocked by:** ${interaction.user.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to modify this channel.' : 'Failed to unlock channel.';
      await modReply(interaction, 'Error', msg, true);
    }
  },
};
