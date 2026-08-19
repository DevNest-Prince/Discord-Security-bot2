


const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "users",
  description: "Checks total users of astryx",
  aliases: [],

  async execute(message, args) {
    const { client } = message;
    const users = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
    const guilds = client.guilds.cache.size;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${client.user.username} Users**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`- **Users:** ${users.toLocaleString()}\n- **Servers:** ${guilds.toLocaleString()}`)
      );

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
