


const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'membercount',
  description: 'Shows the member count of the server',
  usage: 'membercount',
  category: 'general',
  aliases: ['mc', 'members'],

  async execute(message, args) {
    const guild = message.guild;

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${guild.name} Member Count**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    await guild.members.fetch();

    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.members.cache.filter(m => !m.user.bot).size;

    const memberInfo = `**Total Members:** ${guild.memberCount}\n**Humans:** ${humans}\n**Bots:** ${bots}`;

    if (guild.icon) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(memberInfo)
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(guild.iconURL({ size: 256 })))
      );
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(memberInfo)
      );
    }

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
