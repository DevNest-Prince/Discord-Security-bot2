
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require("discord.js");

const emojis = require("../../emojis.json");
const { fetchAnimalImage } = require("../../utils/animalApi");

module.exports = {
  name: "redpanda",
  description: "Random picture of a red panda",

  async execute(message) {
    try {
      const imageUrl = await fetchAnimalImage('redpanda');
      if (!imageUrl) return message.reply(`${emojis.error} No image found right now. Try again in a moment.`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Random Red Panda`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription("Random red panda image")
          )
        );

      await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error("Error fetching red panda image:", error);
      await message.reply(`${emojis.error} Failed to fetch red panda image. Please try again later.`);
    }
  }
};
