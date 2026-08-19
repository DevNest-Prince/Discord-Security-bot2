


const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roleplay")
    .setDescription("Roleplay commands with GIFs")
    .addSubcommand(subcommand =>
      subcommand
        .setName("hug")
        .setDescription("Give someone a warm hug")
        .addUserOption(option =>
          option.setName("user").setDescription("The user to hug").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("kiss")
        .setDescription("Kiss someone")
        .addUserOption(option =>
          option.setName("user").setDescription("The user to kiss").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("lick")
        .setDescription("Lick someone")
        .addUserOption(option =>
          option.setName("user").setDescription("The user to lick").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("pat")
        .setDescription("Pat someone")
        .addUserOption(option =>
          option.setName("user").setDescription("The user to pat").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("slap")
        .setDescription("Slap someone")
        .addUserOption(option =>
          option.setName("user").setDescription("The user to slap").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("tickle")
        .setDescription("Tickle someone")
        .addUserOption(option =>
          option.setName("user").setDescription("The user to tickle").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("poke")
        .setDescription("Poke someone")
        .addUserOption(option =>
          option.setName("user").setDescription("The user to poke").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("deathstare")
        .setDescription("Give someone a death stare")
        .addUserOption(option =>
          option.setName("user").setDescription("The user to stare at").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand.setName("dance").setDescription("Dance!")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("cry").setDescription("Cry")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("laugh").setDescription("Laugh out loud")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("smile").setDescription("Smile")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("blush").setDescription("Blush")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("wink").setDescription("Wink")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("thumbsup").setDescription("Give a thumbs up")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("clap").setDescription("Clap")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("bow").setDescription("Take a bow")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("salute").setDescription("Salute")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("facepalm").setDescription("Facepalm")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("shrug").setDescription("Shrug")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("sleep").setDescription("Go to sleep")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("eat").setDescription("Eat something")
    )
    .addSubcommand(subcommand =>
      subcommand.setName("kill").setDescription("Kill someone")
        .addUserOption(option =>
          option.setName("user").setDescription("The user to kill").setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand.setName("run").setDescription("Run away")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const subcommandFile = path.join(__dirname, "subcommands", `${subcommand}.js`);

    if (fs.existsSync(subcommandFile)) {
      const subcommandModule = require(subcommandFile);
      await subcommandModule.execute(interaction);
    }
  }
};
