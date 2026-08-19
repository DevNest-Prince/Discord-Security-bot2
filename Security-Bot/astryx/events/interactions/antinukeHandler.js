


const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ChannelType,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder
} = require('discord.js');
const { AntinukeConfig, AntinukeWhitelist } = require('../../../database/models');
const emojis = require('../../emojis.json');

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isStringSelectMenu()) {
    if (id === 'antinuke_setup_modules') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can configure antinuke.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedModules = interaction.values;
      const allModules = [
        'antiBan', 'antiKick', 'antiBot',
        'antiChannelCreate', 'antiChannelDelete', 'antiChannelEdit', 'antiEveryoneMention',
        'antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate', 'antiMemberUpdate',
        'antiGuildUpdate', 'antiIntegration',
        'antiWebhookCreate', 'antiWebhookDelete', 'antiWebhookUpdate',
        'antiPrune', 'antiEmoji', 'autoRecovery'
      ];

      const updateData = {};
      for (const mod of allModules) {
        updateData[mod] = selectedModules.includes(mod);
      }

      await AntinukeConfig.update(updateData, { where: { guildId: guild.id } });

      return interaction.deferUpdate();
    }

    if (id.startsWith('antinuke_whitelist_events:')) {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can manage the whitelist.',
          flags: MessageFlags.Ephemeral
        });
      }

      const userId = id.split(':')[1];
      const selectedEvents = interaction.values;

      const existing = await AntinukeWhitelist.findOne({
        where: { guildId: guild.id, userId }
      });

      if (existing) {
        const currentEvents = existing.events || [];
        const mergedEvents = [...new Set([...currentEvents, ...selectedEvents])];
        await existing.update({ events: mergedEvents });
      } else {
        await AntinukeWhitelist.create({
          guildId: guild.id,
          userId: userId,
          addedBy: interaction.user.id,
          events: selectedEvents
        });
      }

      const EVENTS = AntinukeWhitelist.EVENTS;
      const eventNames = selectedEvents.map(e => EVENTS[e] || e).join(', ');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`<@${userId}> has been whitelisted for: **${eventNames}**`)
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id.startsWith('antinuke_whitelist_remove_events:')) {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can manage the whitelist.',
          flags: MessageFlags.Ephemeral
        });
      }

      const userId = id.split(':')[1];
      const eventsToRemove = interaction.values;

      const existing = await AntinukeWhitelist.findOne({
        where: { guildId: guild.id, userId }
      });

      if (!existing) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('User is not on the whitelist.')
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const currentEvents = existing.events || [];
      const remainingEvents = currentEvents.filter(e => !eventsToRemove.includes(e));

      if (remainingEvents.length === 0) {
        await existing.destroy();
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`<@${userId}> has been removed from the whitelist.`)
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      await existing.update({ events: remainingEvents });

      const EVENTS = AntinukeWhitelist.EVENTS;
      const removedNames = eventsToRemove.map(e => EVENTS[e] || e).join(', ');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Removed whitelist for: **${removedNames}**`)
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_punishment_select') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can configure antinuke.',
          flags: MessageFlags.Ephemeral
        });
      }

      const punishment = interaction.values[0];
      await AntinukeConfig.update({ punishment }, { where: { guildId: guild.id } });
      const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Antinuke Setup\n**Step 2 of 3** - Threshold & Punishment')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Configure how many actions trigger antinuke and what punishment to apply:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_threshold_select')
              .setPlaceholder('Select threshold')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('2 actions').setValue('2').setDefault(config.threshold === 2),
                new StringSelectMenuOptionBuilder().setLabel('3 actions').setValue('3').setDefault(config.threshold === 3),
                new StringSelectMenuOptionBuilder().setLabel('5 actions').setValue('5').setDefault(config.threshold === 5),
                new StringSelectMenuOptionBuilder().setLabel('10 actions').setValue('10').setDefault(config.threshold === 10)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_punishment_select')
              .setPlaceholder('Select punishment')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Strip All Roles').setDescription('Remove all roles from the violator').setValue('stripall').setDefault(config.punishment === 'stripall'),
                new StringSelectMenuOptionBuilder().setLabel('Kick').setDescription('Kick the violator from the server').setValue('kick').setDefault(config.punishment === 'kick'),
                new StringSelectMenuOptionBuilder().setLabel('Ban').setDescription('Ban the violator from the server').setValue('ban').setDefault(config.punishment === 'ban')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_setup_next_2')
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('antinuke_setup_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_threshold_select') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can configure antinuke.',
          flags: MessageFlags.Ephemeral
        });
      }

      const threshold = parseInt(interaction.values[0]);
      await AntinukeConfig.update({ threshold }, { where: { guildId: guild.id } });
      const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Antinuke Setup\n**Step 2 of 3** - Threshold & Punishment')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Configure how many actions trigger antinuke and what punishment to apply:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_threshold_select')
              .setPlaceholder('Select threshold')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('2 actions').setValue('2').setDefault(config.threshold === 2),
                new StringSelectMenuOptionBuilder().setLabel('3 actions').setValue('3').setDefault(config.threshold === 3),
                new StringSelectMenuOptionBuilder().setLabel('5 actions').setValue('5').setDefault(config.threshold === 5),
                new StringSelectMenuOptionBuilder().setLabel('10 actions').setValue('10').setDefault(config.threshold === 10)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_punishment_select')
              .setPlaceholder('Select punishment')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Strip All Roles').setDescription('Remove all roles from the violator').setValue('stripall').setDefault(config.punishment === 'stripall'),
                new StringSelectMenuOptionBuilder().setLabel('Kick').setDescription('Kick the violator from the server').setValue('kick').setDefault(config.punishment === 'kick'),
                new StringSelectMenuOptionBuilder().setLabel('Ban').setDescription('Ban the violator from the server').setValue('ban').setDefault(config.punishment === 'ban')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_setup_next_2')
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('antinuke_setup_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isUserSelectMenu()) {
    if (id === 'antinuke_whitelist_add') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can manage the whitelist.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedUser = interaction.users.first();
      if (!selectedUser) {
        return interaction.update({ components: [] });
      }

      const EVENTS = AntinukeWhitelist.EVENTS;
      const eventOptions = Object.entries(EVENTS).map(([value, label]) => ({
        label: label,
        value: value,
        description: `Whitelist for ${label}`
      }));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Whitelist ${selectedUser.username}`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Select which events to whitelist this user for:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`antinuke_whitelist_events:${selectedUser.id}`)
              .setPlaceholder('Select events to whitelist')
              .setMinValues(1)
              .setMaxValues(Object.keys(EVENTS).length)
              .addOptions(eventOptions)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`antinuke_whitelist_all:${selectedUser.id}`)
              .setLabel('Whitelist All Events')
              .setStyle(ButtonStyle.Primary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_whitelist_remove') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can manage the whitelist.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedUser = interaction.users.first();
      if (!selectedUser) {
        return interaction.update({ components: [] });
      }

      const deleted = await AntinukeWhitelist.destroy({
        where: { guildId: guild.id, userId: selectedUser.id }
      });

      if (!deleted) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${selectedUser.username}** is not on the whitelist.`)
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${selectedUser.username}** has been removed from the whitelist.`)
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isButton()) {
    if (id === 'antinuke_setup_next_1') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can configure antinuke.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Antinuke Setup\n**Step 2 of 3** - Threshold & Punishment')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Configure how many actions trigger antinuke and what punishment to apply:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_threshold_select')
              .setPlaceholder('Select threshold')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('2 actions').setValue('2'),
                new StringSelectMenuOptionBuilder().setLabel('3 actions').setValue('3').setDefault(true),
                new StringSelectMenuOptionBuilder().setLabel('5 actions').setValue('5'),
                new StringSelectMenuOptionBuilder().setLabel('10 actions').setValue('10')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_punishment_select')
              .setPlaceholder('Select punishment')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Strip All Roles').setDescription('Remove all roles from the violator').setValue('stripall').setDefault(true),
                new StringSelectMenuOptionBuilder().setLabel('Kick').setDescription('Kick the violator from the server').setValue('kick'),
                new StringSelectMenuOptionBuilder().setLabel('Ban').setDescription('Ban the violator from the server').setValue('ban')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_setup_next_2')
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('antinuke_setup_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_setup_next_2') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can configure antinuke.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Antinuke Setup\n**Step 3 of 3** - Log Channel')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Select a channel to receive antinuke alerts:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('antinuke_setup_logs')
              .setPlaceholder('Select log channel')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(0)
              .setMaxValues(1)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_setup_finish')
              .setLabel('Finish Setup')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('antinuke_setup_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_setup_finish') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can configure antinuke.',
          flags: MessageFlags.Ephemeral
        });
      }

      const [config] = await AntinukeConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });
      try {
        config.enabled = true;
        await config.save();
      } catch (err) {
        console.error('[ANTINUKE SETUP] Failed to enable antinuke:', err.message);
      }

      const enabledModules = [];
      const moduleNames = {
        antiBan: 'Anti-Ban',
        antiKick: 'Anti-Kick',
        antiBot: 'Anti-Bot',
        antiChannelCreate: 'Anti-Channel Create',
        antiChannelDelete: 'Anti-Channel Delete',
        antiChannelEdit: 'Anti-Channel Update',
        antiEveryoneMention: 'Anti-Everyone/Here',
        antiRoleCreate: 'Anti-Role Create',
        antiRoleDelete: 'Anti-Role Delete',
        antiRoleUpdate: 'Anti-Role Update',
        antiMemberUpdate: 'Anti-Member Update',
        antiGuildUpdate: 'Anti-Guild Update',
        antiIntegration: 'Anti-Integration',
        antiWebhookCreate: 'Anti-Webhook Create',
        antiWebhookDelete: 'Anti-Webhook Delete',
        antiWebhookUpdate: 'Anti-Webhook Update',
        antiPrune: 'Anti-Prune',
        antiEmoji: 'Anti-Emoji',
        autoRecovery: 'Auto Recovery'
      };

      for (const [key, name] of Object.entries(moduleNames)) {
        if (config[key]) enabledModules.push(name);
      }

      const punishmentLabels = { stripall: 'Strip All Roles', kick: 'Kick', ban: 'Ban' };

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Antinuke Setup Complete!')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Your server is now protected!\n\n` +
            `**Threshold:** ${config.threshold} actions in ${config.timeframe}s\n` +
            `**Punishment:** ${punishmentLabels[config.punishment]}\n` +
            `**Log Channel:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Not set'}\n\n` +
            `**Enabled Modules:**\n${enabledModules.map(m => `${emojis.enabled} ${m}`).join('\n') || 'None'}`
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_setup_cancel') {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Setup Cancelled')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Antinuke setup has been cancelled.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_toggle') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can toggle antinuke.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });
      if (!config) return true;

      await config.update({ enabled: !config.enabled });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Antinuke ${config.enabled ? 'Enabled' : 'Disabled'}`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            config.enabled
              ? 'Antinuke has been enabled. Your server is now protected.'
              : 'Antinuke has been disabled. Your server is no longer protected.'
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_whitelist_add_btn') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can manage the whitelist.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Add to Whitelist')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Select a user to add to the whitelist:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
              .setCustomId('antinuke_whitelist_add')
              .setPlaceholder('Select user to whitelist')
              .setMinValues(1)
              .setMaxValues(1)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_whitelist_remove_btn') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can manage the whitelist.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Remove from Whitelist')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Select a user to remove from the whitelist:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
              .setCustomId('antinuke_whitelist_remove')
              .setPlaceholder('Select user to remove')
              .setMinValues(1)
              .setMaxValues(1)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id.startsWith('antinuke_whitelist_all:')) {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can manage the whitelist.',
          flags: MessageFlags.Ephemeral
        });
      }

      const userId = id.split(':')[1];

      const existing = await AntinukeWhitelist.findOne({
        where: { guildId: guild.id, userId }
      });

      if (existing) {
        await existing.update({ events: null });
      } else {
        await AntinukeWhitelist.create({
          guildId: guild.id,
          userId: userId,
          addedBy: interaction.user.id,
          events: null
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`<@${userId}> has been whitelisted for **all events**.`)
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id.startsWith('antinuke_whitelist_remove_all:')) {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can manage the whitelist.',
          flags: MessageFlags.Ephemeral
        });
      }

      const userId = id.split(':')[1];

      const deleted = await AntinukeWhitelist.destroy({
        where: { guildId: guild.id, userId }
      });

      if (!deleted) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('User is not on the whitelist.')
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`<@${userId}> has been removed from the whitelist.`)
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_whitelist_list_btn') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can view the whitelist.',
          flags: MessageFlags.Ephemeral
        });
      }

      const whitelist = await AntinukeWhitelist.findAll({ where: { guildId: guild.id } });
      const EVENTS = AntinukeWhitelist.EVENTS;

      if (whitelist.length === 0) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### Antinuke Whitelist')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('No users are whitelisted.')
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let detailedContent = '';
      for (const w of whitelist) {
        const events = w.events;
        let eventList;
        if (!events || events.length === 0) {
          eventList = '`All Events`';
        } else {
          eventList = events.map(e => `\`${EVENTS[e] || e}\``).join(', ');
        }
        detailedContent += `<@${w.userId}>\n${eventList}\n\n`;
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Antinuke Whitelist - Detailed (${whitelist.length})`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(detailedContent.trim())
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_whitelist_add_btn')
              .setLabel('Add User')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('antinuke_whitelist_remove_btn')
              .setLabel('Remove User')
              .setStyle(ButtonStyle.Danger)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_edit_modules') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can edit antinuke settings.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Edit Modules')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Select which protection modules to enable:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_setup_modules')
              .setPlaceholder('Select modules to enable')
              .setMinValues(0)
              .setMaxValues(19)
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Anti-Ban').setDescription('Prevent mass banning').setValue('antiBan').setDefault(config.antiBan),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Kick').setDescription('Prevent mass kicking').setValue('antiKick').setDefault(config.antiKick),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Bot').setDescription('Prevent bot additions').setValue('antiBot').setDefault(config.antiBot),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Channel Create').setDescription('Prevent mass channel creation').setValue('antiChannelCreate').setDefault(config.antiChannelCreate),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Channel Delete').setDescription('Prevent mass channel deletion').setValue('antiChannelDelete').setDefault(config.antiChannelDelete),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Channel Update').setDescription('Prevent mass channel modifications').setValue('antiChannelEdit').setDefault(config.antiChannelEdit),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Everyone/Here').setDescription('Prevent @everyone/@here spam').setValue('antiEveryoneMention').setDefault(config.antiEveryoneMention),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Role Create').setDescription('Prevent mass role creation').setValue('antiRoleCreate').setDefault(config.antiRoleCreate),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Role Delete').setDescription('Prevent mass role deletion').setValue('antiRoleDelete').setDefault(config.antiRoleDelete),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Role Update').setDescription('Prevent dangerous permission grants').setValue('antiRoleUpdate').setDefault(config.antiRoleUpdate),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Member Update').setDescription('Prevent granting dangerous roles').setValue('antiMemberUpdate').setDefault(config.antiMemberUpdate),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Guild Update').setDescription('Prevent server setting changes').setValue('antiGuildUpdate').setDefault(config.antiGuildUpdate),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Integration').setDescription('Prevent unauthorized integrations').setValue('antiIntegration').setDefault(config.antiIntegration),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Webhook Create').setDescription('Prevent webhook creation').setValue('antiWebhookCreate').setDefault(config.antiWebhookCreate),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Webhook Delete').setDescription('Prevent webhook deletion').setValue('antiWebhookDelete').setDefault(config.antiWebhookDelete),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Webhook Update').setDescription('Prevent webhook modification').setValue('antiWebhookUpdate').setDefault(config.antiWebhookUpdate),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Prune').setDescription('Prevent mass member pruning').setValue('antiPrune').setDefault(config.antiPrune),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Emoji').setDescription('Prevent emoji abuse').setValue('antiEmoji').setDefault(config.antiEmoji),
                new StringSelectMenuOptionBuilder().setLabel('Auto Recovery').setDescription('Auto-restore deleted channels/roles').setValue('autoRecovery').setDefault(config.autoRecovery)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_edit_done')
              .setLabel('Done')
              .setStyle(ButtonStyle.Success)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_edit_settings') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can edit antinuke settings.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Edit Settings')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Configure threshold and punishment:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_threshold_select')
              .setPlaceholder('Select threshold')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('2 actions').setValue('2').setDefault(config.threshold === 2),
                new StringSelectMenuOptionBuilder().setLabel('3 actions').setValue('3').setDefault(config.threshold === 3),
                new StringSelectMenuOptionBuilder().setLabel('5 actions').setValue('5').setDefault(config.threshold === 5),
                new StringSelectMenuOptionBuilder().setLabel('10 actions').setValue('10').setDefault(config.threshold === 10)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('antinuke_punishment_select')
              .setPlaceholder('Select punishment')
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Strip All Roles').setValue('stripall').setDefault(config.punishment === 'stripall'),
                new StringSelectMenuOptionBuilder().setLabel('Kick').setValue('kick').setDefault(config.punishment === 'kick'),
                new StringSelectMenuOptionBuilder().setLabel('Ban').setValue('ban').setDefault(config.punishment === 'ban')
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('antinuke_setup_logs')
              .setPlaceholder('Select log channel')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(0)
              .setMaxValues(1)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_edit_done')
              .setLabel('Done')
              .setStyle(ButtonStyle.Success)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'antinuke_edit_done') {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Settings Updated')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Your antinuke settings have been saved.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id === 'antinuke_setup_logs') {
      const guild = interaction.guild;
      if (guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: 'Only the server owner can configure antinuke.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedChannel = interaction.channels.first();
      const channelId = selectedChannel?.id || null;

      await AntinukeConfig.update({ logChannelId: channelId }, { where: { guildId: guild.id } });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Antinuke Setup\n**Step 3 of 3** - Log Channel')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Select a channel to receive antinuke alerts:\n\n` +
            (selectedChannel ? `✅ **Log channel set to:** <#${channelId}>` : '⚠️ **No channel selected** — logs will be disabled.')
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('antinuke_setup_logs')
              .setPlaceholder(selectedChannel ? `#${selectedChannel.name}` : 'Select log channel')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(0)
              .setMaxValues(1)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('antinuke_setup_finish')
              .setLabel('Finish Setup')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('antinuke_setup_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  return false;
}

module.exports = { handle };
