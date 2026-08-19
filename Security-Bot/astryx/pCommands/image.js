const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, EmbedBuilder } = require('discord.js');
const emojis = require('../emojis.json');
const Bytez = require('bytez.js');
const config = require('../config');

module.exports = {
  name: 'imagine',
  description: 'Generate images using AI (Imagen 4.0)',
  aliases: ['img', 'image', 'generate'],

  async execute(message, args) {
    try {
      const prompt = args.join(' ').trim();

      if (!prompt) {
        const c = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('**Usage Error**'))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${config.PREFIX}image <prompt>\n\nExample: ${config.PREFIX}image a neon city skyline`));
        return message.reply({ components: [c], flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 });
      }

      if (prompt.length > 500) {
        return message.reply('Prompt is too long (max 500 characters).');
      }

      const apiKey = config.BYTEZ.API_KEY;
      if (!apiKey) {
        return message.reply('Image generation is not configured.');
      }

      const loadingMsg = await message.reply('Generating image... this may take a moment.');

      try {
        const sdk = new Bytez(apiKey);
        const model = sdk.model('google/imagen-4.0-ultra-generate-001');
        const { error, output } = await model.run(prompt);

        if (error) {
          await loadingMsg.delete().catch(() => {});
          const c = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('**Generation Failed**'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Error: ${error.message || error}`));
          return message.reply({ components: [c], flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 });
        }

        if (!output?.images?.length) {
          await loadingMsg.delete().catch(() => {});
          return message.reply('No image was generated. Please try again with a different prompt.');
        }

        const imageData = output.images[0];
        const embed = new EmbedBuilder()
          .setTitle('AI Generated Image')
          .setDescription(`**Prompt:** ${prompt}`)
          .setImage(imageData.url || imageData)
          
          .setFooter({ text: 'Powered by Imagen 4.0 Ultra' })
          .setTimestamp();

        await loadingMsg.delete().catch(() => {});

        const c = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.success} **Image Generated Successfully**`))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Requested by ${message.author.mention}`));

        return message.reply({
          embeds: [embed],
          components: [c],
          flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
      } catch (err) {
        await loadingMsg.delete().catch(() => {});
        console.error('[IMAGE] Generation error:', err);

        const errorMsg = err.message || 'Unknown error occurred';
        const c = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('**Generation Error**'))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`\`\`${errorMsg}\`\`\``));

        return message.reply({ components: [c], flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 });
      }
    } catch (err) {
      console.error('[IMAGE] Command error:', err);
      return message.reply('An error occurred while processing your request.');
    }
  }
};
