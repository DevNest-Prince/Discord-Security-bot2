


const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const ReactionRoles = require('../../../database/models/ReactionRoles');
const setupModule = require('../../hybrid/reactionroles/subcommands/setup');

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id.startsWith('rr_add_pair_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Only the command user can use this!',
          flags: MessageFlags.Ephemeral
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`rr_add_pair_modal_${originalUserId}`)
        .setTitle('Add Emoji-Role Pair');

      const emojiInput = new TextInputBuilder()
        .setCustomId('rr_emoji')
        .setLabel('Emoji')
        .setPlaceholder('⚽')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true);

      const roleInput = new TextInputBuilder()
        .setCustomId('rr_role_id')
        .setLabel('Role ID')
        .setPlaceholder('123456789')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(true);

      const roleLabel = new TextInputBuilder()
        .setCustomId('rr_role_label')
        .setLabel('Role Label (optional)')
        .setPlaceholder('Football Fan')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(50)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(emojiInput),
        new ActionRowBuilder().addComponents(roleInput),
        new ActionRowBuilder().addComponents(roleLabel)
      );

      return interaction.showModal(modal);
    }

    if (id.startsWith('rr_step2_continue_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Only the command user can use this!',
          flags: MessageFlags.Ephemeral
        });
      }

      await setupModule.step3(interaction);
      return true;
    }

    if (id.startsWith('rr_setup_confirm_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Only the command user can use this!',
          flags: MessageFlags.Ephemeral
        });
      }

      if (!interaction.client.reactionRolesSetup?.has(interaction.user.id)) {
        return interaction.reply({
          content: 'Session expired. Please run `/reactionroles setup` again.',
          flags: MessageFlags.Ephemeral
        });
      }

      const session = interaction.client.reactionRolesSetup.get(interaction.user.id);

      const embed = new EmbedBuilder()
        .setTitle('Reaction Roles')
        .setDescription('React to get a role!')
        
        .setFooter({ text: interaction.guild.name });

      let fieldValue = '';
      for (const pair of session.emojiRolePairs) {
        const label = pair.roleLabel || `<@&${pair.roleId}>`;
        fieldValue += `${pair.emoji} → ${label}\n`;
      }

      embed.addFields({
        name: 'Available Roles',
        value: fieldValue || 'No roles configured'
      });

      const channel = interaction.guild.channels.cache.get(session.channelId);
      if (!channel) {
        return interaction.reply({
          content: 'Channel not found!',
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        const postedMessage = await channel.send({ embeds: [embed] });

        await ReactionRoles.create({
          guildId: interaction.guild.id,
          messageId: postedMessage.id,
          channelId: session.channelId,
          embedTitle: 'Reaction Roles',
          embedDescription: 'React to get a role!',
          embedColor: 0x5B92D3,
          emojiRolePairs: session.emojiRolePairs,
          enabled: true
        });

        for (const pair of session.emojiRolePairs) {
          try {
            await postedMessage.react(pair.emoji);
          } catch (error) {
            console.error(`Failed to add reaction ${pair.emoji}:`, error);
          }
        }

        interaction.client.reactionRolesSetup.delete(interaction.user.id);

        const successContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('✅ Reaction Roles Created!')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Channel:** <#${session.channelId}>\n` +
              `**Message ID:** ${postedMessage.id}\n\n` +
              `Reaction roles are now active! Users can react to get roles.`
            )
          );

        return interaction.update({
          components: [successContainer],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('Error creating reaction roles:', error);
        return interaction.reply({
          content: 'Failed to create reaction roles message!',
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (id.startsWith('rr_setup_back_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Only the command user can use this!',
          flags: MessageFlags.Ephemeral
        });
      }

      if (interaction.client.reactionRolesSetup?.has(interaction.user.id)) {
        const session = interaction.client.reactionRolesSetup.get(interaction.user.id);
        await setupModule.step2(interaction, session.channelId);
      }
      return true;
    }

    if (id === 'rr_setup_cancel') {
      if (interaction.client.reactionRolesSetup?.has(interaction.user.id)) {
        interaction.client.reactionRolesSetup.delete(interaction.user.id);
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Reaction Roles Setup Cancelled')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Setup has been cancelled.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isModalSubmit()) {
    if (id.startsWith('rr_add_pair_modal_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Only the command user can use this!',
          flags: MessageFlags.Ephemeral
        });
      }

      const emoji = interaction.fields.getTextInputValue('rr_emoji');
      const roleId = interaction.fields.getTextInputValue('rr_role_id');
      const roleLabel = interaction.fields.getTextInputValue('rr_role_label') || null;

      try {
        const role = await interaction.guild.roles.fetch(roleId);
        if (!role) {
          return interaction.reply({
            content: `Role <@&${roleId}> not found!`,
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (error) {
        return interaction.reply({
          content: `Invalid role ID: ${roleId}`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (!interaction.client.reactionRolesSetup?.has(interaction.user.id)) {
        return interaction.reply({
          content: 'Session expired. Please run `/reactionroles setup` again.',
          flags: MessageFlags.Ephemeral
        });
      }

      const session = interaction.client.reactionRolesSetup.get(interaction.user.id);

      session.emojiRolePairs.push({
        emoji,
        roleId,
        roleLabel
      });

      let pairsSummary = '';
      for (const pair of session.emojiRolePairs) {
        const label = pair.roleLabel || `<@&${pair.roleId}>`;
        pairsSummary += `${pair.emoji} → ${label}\n`;
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Emoji-Role Pairs Added')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Current Pairs:**\n${pairsSummary}`
          )
        );

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rr_add_pair_${interaction.user.id}`)
          .setLabel('Add Another')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`rr_step2_continue_${interaction.user.id}`)
          .setLabel('Continue')
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        components: [container, buttonRow],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id.startsWith('rr_channel_select_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        return interaction.reply({
          content: 'Only the command user can use this!',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        return interaction.reply({
          content: 'No channel selected!',
          flags: MessageFlags.Ephemeral
        });
      }

      await setupModule.step2(interaction, selectedChannel.id);
      return true;
    }
  }

  return false;
}

module.exports = { handle };
