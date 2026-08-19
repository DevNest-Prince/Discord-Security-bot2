


const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'banner',
  description: 'Get the banner of a user',
  usage: 'banner [user]',
  category: 'general',

  async execute(message, args) {
    let user = message.mentions.users.first();

    if (!user && args.length > 0) {
      try {
        user = await message.client.users.fetch(args[0]);
      } catch (e) {
        user = message.author;
      }
    }

    if (!user) {
      user = message.author;
    }

    try {
      const fetchedUser = await message.client.users.fetch(user.id, { force: true });

      if (!fetchedUser.banner) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# **${user.displayName}** doesn't have a banner set.`)
          );

        return await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder();

      const jpgUrl = fetchedUser.bannerURL({ extension: 'jpg', size: 4096 });
      const pngUrl = fetchedUser.bannerURL({ extension: 'png', size: 4096 });

      const mediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(jpgUrl)
            .setDescription(`${user.displayName}'s Banner`)
        );

      container.addMediaGalleryComponents(mediaGallery);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('JPG')
            .setStyle(ButtonStyle.Link)
            .setURL(jpgUrl),
          new ButtonBuilder()
            .setLabel('PNG')
            .setStyle(ButtonStyle.Link)
            .setURL(pngUrl)
        );

      container.addActionRowComponents(buttonRow);

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Failed to fetch user banner.`)
        );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
