


const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType
} = require('discord.js');
const VoiceControlView = require('../../utils/j2cView');
const { J2CConfig } = require('../../../database/models');
const j2cSetupModule = require('../../hybrid/j2c/subcommands/setup');

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id.startsWith('j2c_')) {
      await VoiceControlView.handleButton(interaction);
      return true;
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (id === 'j2c_dc_select') {
      const selectedUserId = interaction.values[0];
      const member = interaction.guild.members.cache.get(selectedUserId);

      if (!member) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Member not found!")
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      if (!member.voice.channel) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Member is not in a voice channel!")
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      try {
        await member.voice.disconnect();
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Successfully disconnected ${member.displayName}`)
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Failed to disconnect the member.")
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return true;
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id === 'j2c_setup_text') {
      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Please select a valid channel.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      interaction.client._j2cSetup = interaction.client._j2cSetup || {};
      interaction.client._j2cSetup[interaction.user.id] = {
        textChannelId: selectedChannel.id
      };

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Join to Create Setup\n**Step 2 of 3**')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Control panel channel: <#${selectedChannel.id}>\n\nNow select the **voice channel** users will join to create a temporary VC:`)
        )
        .addActionRowComponents(
          new ActionRowBuilder()
            .addComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId('j2c_setup_voice')
                .setPlaceholder('Select J2C trigger voice channel')
                .setChannelTypes(ChannelType.GuildVoice)
            )
        );

      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
      return true;
    }

    if (id === 'j2c_setup_voice') {
      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Please select a valid channel.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      const setupData = interaction.client._j2cSetup?.[interaction.user.id];
      if (!setupData) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Setup session expired. Please run `/j2c setup` again.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      setupData.voiceChannelId = selectedChannel.id;

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Join to Create Setup\n**Step 3 of 3**')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Control panel: <#${setupData.textChannelId}>\nTrigger channel: <#${selectedChannel.id}>\n\nFinally, select the **category** where temporary VCs will be created:`)
        )
        .addActionRowComponents(
          new ActionRowBuilder()
            .addComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId('j2c_setup_category')
                .setPlaceholder('Select category for temp VCs')
                .setChannelTypes(ChannelType.GuildCategory)
            )
        );

      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
      return true;
    }

    if (id === 'j2c_setup_category') {
      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Please select a valid category.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      const setupData = interaction.client._j2cSetup?.[interaction.user.id];
      if (!setupData || !setupData.textChannelId || !setupData.voiceChannelId) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Setup session expired. Please run `/j2c setup` again.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      try {
        await J2CConfig.upsert({
          guildId: interaction.guild.id,
          textChannelId: setupData.textChannelId,
          voiceChannelId: setupData.voiceChannelId,
          categoryId: selectedChannel.id
        });

        const textChannel = interaction.guild.channels.cache.get(setupData.textChannelId);
        if (textChannel) {
          await j2cSetupModule.sendControlPanel(textChannel);
        }

        delete interaction.client._j2cSetup[interaction.user.id];

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Join to Create Setup Complete')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Control Panel:** <#${setupData.textChannelId}>\n` +
              `**Trigger Channel:** <#${setupData.voiceChannelId}>\n` +
              `**Category:** <#${selectedChannel.id}>\n\n` +
              'The control panel has been posted. Users can now join the trigger voice channel to create temporary VCs!'
            )
          );

        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('Error saving J2C config:', error);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Failed to save J2C configuration. Please try again.')
          );
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return true;
    }
  }

  return false;
}

module.exports = { handle };
