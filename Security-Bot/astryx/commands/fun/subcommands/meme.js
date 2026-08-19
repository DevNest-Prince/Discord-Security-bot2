


const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'meme',
  description: 'Send A Meme!',

  async execute(interaction) {
    await interaction.deferReply();

    const Reds = ["memes", "me_irl", "dankmemes", "comedyheaven", "Animemes"];
    const Rads = Reds[Math.floor(Math.random() * Reds.length)];

    try {
      const res = await fetch(`https://www.reddit.com/r/${Rads}/random/.json`);
      const json = await res.json();

      if (!json[0]) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### No Memes Found`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Couldn't fetch a meme right now. Your life is the meme!`)
          );
        return await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const data = json[0].data.children[0].data;

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Reddit Meme`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${data.title}**\nby u/${data.author} in r/${Rads}`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(data.url)
              .setDescription(data.title)
          )
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${data.ups || 0} upvotes | ${data.num_comments || 0} comments`)
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("View on Reddit")
              .setStyle(ButtonStyle.Link)
              .setURL(`https://reddit.com${data.permalink}`)
          )
        );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Reddit API Error`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Failed to fetch meme from Reddit. Please try again later.')
        );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
