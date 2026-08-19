


const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  REST,
  PermissionFlagsBits
} = require("discord.js");

const emojis = require("../../emojis.json");

const rest = new REST({ version: "10" });

module.exports = {
  name: "serverresetprofile",
  description: "Reset the bot's server profile to default",
  aliases: ["sresetprofile", "sreset"],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} You need the **Manage Server** permission to use this command!`)
        );
      return message.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    rest.setToken(message.client.token);

    const guildId = message.guild.id;

    try {
      await rest.patch(`/guilds/${guildId}/members/@me`, {
        body: {
          avatar: null,
          banner: null,
          bio: null,
          nick: null
        },
      });

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.success} Successfully reset server profile to default!`)
        );
      await message.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error resetting server profile:", error);
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} An error occurred while resetting the server profile. Please try again later.`)
        );
      await message.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
