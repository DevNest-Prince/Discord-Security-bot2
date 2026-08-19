


const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../emojis.json');

module.exports = {
  name: 'ascii85',
  description: 'Encode text to ASCII85',

  async execute(interaction) {
    const text = interaction.options.getString('text');

    if (text.length > 1000) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Text is too long! Maximum 1000 characters.`)
        );
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    try {
      const buffer = Buffer.from(text);
      let encoded = '';

      for (let i = 0; i < buffer.length; i += 4) {
        let value = 0;
        const chunk = buffer.slice(i, i + 4);

        for (let j = 0; j < chunk.length; j++) {
          value = value * 256 + chunk[j];
        }

        if (chunk.length < 4) {
          value *= Math.pow(256, 4 - chunk.length);
        }

        if (value === 0 && chunk.length === 4) {
          encoded += 'z';
        } else {
          let result = '';
          for (let j = 0; j < 5; j++) {
            result = String.fromCharCode(33 + (value % 85)) + result;
            value = Math.floor(value / 85);
          }
          encoded += result.slice(0, chunk.length + 1);
        }
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**ASCII85 Encoding**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emojis.arrow} **Input:** ${text}\n${emojis.arrow} **Encoded:**\n\`\`\`${encoded}\`\`\``
          )
        );

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Failed to encode to ASCII85!`)
        );
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }
  },
};
