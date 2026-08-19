


const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../emojis.json');

module.exports = {
  name: 'binstr',
  description: 'Convert binary to a string',

  async execute(message, args) {
    if (!args || args.length === 0) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Please provide binary to convert!\n**Usage:** \`binstr <binary>\``)
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    let binary = args.join(' ').trim();
    binary = binary.replace(/\s+/g, ' ');
    const binaryArray = binary.split(' ');

    for (const bin of binaryArray) {
      if (!/^[01]+$/.test(bin)) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${emojis.error} Invalid binary value! Use only 0 and 1.`)
          );
        return message.reply({
          components: [container],
          flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
      }
    }

    try {
      const text = binaryArray.map(bin => {
        return String.fromCharCode(parseInt(bin, 2));
      }).join('');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Binary to String**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emojis.arrow} **Result:** ${text}`
          )
        );

      return message.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Failed to convert binary to string!`)
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }
  },
};
