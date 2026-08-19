


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
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder
} = require('discord.js');
const { AutomodConfig, AutomodWhitelist } = require('../../../database/models');
const emojis = require('../../emojis.json');

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id === 'automod_setup_next_1') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      let selectedModules = [];

      if (interaction.client.automodSetup?.has(interaction.user.id)) {
        const session = interaction.client.automodSetup.get(interaction.user.id);
        selectedModules = session.selectedModules || [];
      }

      if (selectedModules.length === 0) {
        const config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });
        if (config) {
          const possibleModules = ['antiSpam', 'antiLink', 'antiInvite', 'antiBadWords', 'antiMassMention', 'antiCaps'];
          selectedModules = possibleModules.filter(mod => config[mod]);
        }
      }

      if (selectedModules.length === 0) {
        return interaction.reply({
          content: 'Please select at least one module from the dropdown first.',
          flags: MessageFlags.Ephemeral
        });
      }

      const setupModule = require('../../hybrid/automod/subcommands/setup');
      await setupModule.step2(interaction, selectedModules);
      return true;
    }

    if (id === 'automod_setup_next_2') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const setupModule = require('../../hybrid/automod/subcommands/setup');
      await setupModule.step3(interaction);
      return true;
    }

    if (id === 'automod_setup_complete') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (!interaction.client.automodSetup?.has(interaction.user.id)) {
        return interaction.reply({
          content: 'Session expired. Please run `/automod setup` again.',
          flags: MessageFlags.Ephemeral
        });
      }

      let config = null;
      try {
        const session = interaction.client.automodSetup.get(interaction.user.id);
        const selectedModules = session.selectedModules;

        const updateData = {
          enabled: true,
          antiSpam: selectedModules.includes('antiSpam'),
          antiLink: selectedModules.includes('antiLink'),
          antiInvite: selectedModules.includes('antiInvite'),
          antiBadWords: selectedModules.includes('antiBadWords'),
          antiMassMention: selectedModules.includes('antiMassMention'),
          antiCaps: selectedModules.includes('antiCaps'),
          antiPing: selectedModules.includes('antiPing')
        };

        await AutomodConfig.update(updateData, { where: { guildId: interaction.guild.id } });
        config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });

        interaction.client.automodSetup.delete(interaction.user.id);
      } catch (dbError) {
        console.error('[AUTOMOD SETUP] Database error:', dbError.message);
        interaction.client.automodSetup.delete(interaction.user.id);
        return interaction.reply({
          content: 'Error saving automod config. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.success} AutoMod Setup Complete!`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

      let punishmentSummary = '';
      const modules = [
        { key: 'antiSpam', name: 'Anti-Spam', label: 'antiSpamPunishment' },
        { key: 'antiLink', name: 'Anti-Link', label: 'antiLinkPunishment' },
        { key: 'antiInvite', name: 'Anti-Invite', label: 'antiInvitePunishment' },
        { key: 'antiBadWords', name: 'Anti-Bad Words', label: 'antiBadWordsPunishment' },
        { key: 'antiMassMention', name: 'Anti-Mass Mention', label: 'antiMassMentionPunishment' },
        { key: 'antiCaps', name: 'Anti-Caps', label: 'antiCapsPunishment' },
        { key: 'antiPing', name: 'Anti-Ping', label: 'antiPingPunishment' }
      ];

      for (const mod of modules) {
        if (config[mod.key]) {
          const punishment = config[mod.label] || 'delete';
          const punishmentLabel = {
            'delete': 'Delete Message',
            'warn': 'Delete & Warn',
            'mute': 'Mute',
            'kick': 'Kick',
            'ban': 'Ban'
          }[punishment] || punishment;
          punishmentSummary += `${emojis.success} ${mod.name} → ${punishmentLabel}\n`;
        }
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Enabled Protections:**\n${punishmentSummary || 'None'}\n\n` +
          `Use \`/automod settings\` to view full configuration.`
        )
      );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_setup_back') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      let config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });
      if (!config) {
        config = await AutomodConfig.create({ guildId: interaction.guild.id });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# AutoMod Setup\n**Step 1 of 3** - Select Modules')
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
              .setCustomId('automod_setup_modules')
              .setPlaceholder('Select modules to enable')
              .setMinValues(0)
              .setMaxValues(7)
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Anti-Spam').setDescription('Rate limit messages').setValue('antiSpam').setDefault(config.antiSpam),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Link').setDescription('Block external links').setValue('antiLink').setDefault(config.antiLink),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Invite').setDescription('Block Discord invites').setValue('antiInvite').setDefault(config.antiInvite),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Bad Words').setDescription('Filter banned words').setValue('antiBadWords').setDefault(config.antiBadWords),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Mass Mention').setDescription('Limit mentions').setValue('antiMassMention').setDefault(config.antiMassMention),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Caps').setDescription('Block excessive caps').setValue('antiCaps').setDefault(config.antiCaps),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Ping').setDescription('Block @everyone/@here').setValue('antiPing').setDefault(config.antiPing)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('automod_setup_next_1')
              .setLabel('Configure Punishments')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('automod_setup_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_setup_cancel') {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# AutoMod Setup Cancelled')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Setup process has been cancelled. No changes were applied.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_setup_finish') {
      const guild = interaction.guild;
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission to configure automod.',
          flags: MessageFlags.Ephemeral
        });
      }

      await AutomodConfig.update({ enabled: true }, { where: { guildId: guild.id } });
      const config = await AutomodConfig.findOne({ where: { guildId: guild.id } });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# AutoMod Setup Complete!')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Status:** Enabled\n` +
            `**Punishment:** ${config.punishment}\n\n` +
            `Use \`/automod settings\` for detailed configuration.`
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_toggle') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });
      if (!config) return false;

      await config.update({ enabled: !config.enabled });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### AutoMod ${config.enabled ? 'Enabled' : 'Disabled'}`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            config.enabled
              ? 'AutoMod has been enabled. Messages will be moderated.'
              : 'AutoMod has been disabled. Messages will no longer be moderated.'
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_edit_modules') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });
      if (!config) return false;

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
              .setCustomId('automod_setup_modules')
              .setPlaceholder('Select modules to enable')
              .setMinValues(0)
              .setMaxValues(7)
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Anti-Spam').setDescription('Rate limit messages').setValue('antiSpam').setDefault(config.antiSpam),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Link').setDescription('Block external links').setValue('antiLink').setDefault(config.antiLink),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Invite').setDescription('Block Discord invites').setValue('antiInvite').setDefault(config.antiInvite),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Bad Words').setDescription('Filter banned words').setValue('antiBadWords').setDefault(config.antiBadWords),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Mass Mention').setDescription('Limit mentions').setValue('antiMassMention').setDefault(config.antiMassMention),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Caps').setDescription('Block excessive caps').setValue('antiCaps').setDefault(config.antiCaps),
                new StringSelectMenuOptionBuilder().setLabel('Anti-Ping').setDescription('Block @everyone/@here').setValue('antiPing').setDefault(config.antiPing)
              )
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('automod_edit_done')
              .setLabel('Done')
              .setStyle(ButtonStyle.Success)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_edit_settings') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await AutomodConfig.findOne({ where: { guildId: interaction.guild.id } });
      if (!config) return false;

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Edit Settings')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Current Thresholds:**\n` +
            `Spam: ${config.spamThreshold} msgs / ${config.spamInterval}s\n` +
            `Mentions: ${config.mentionLimit} max\n` +
            `Caps: ${config.capsPercentage}% max\n` +
            `**Log Channel:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Not set'}\n\n` +
            `Select a log channel below:`
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('automod_setup_logs')
              .setPlaceholder('Select log channel')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(0)
              .setMaxValues(1)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('automod_edit_done')
              .setLabel('Done')
              .setStyle(ButtonStyle.Success)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_edit_done') {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Settings Updated')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Your automod settings have been saved.')
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_add_btn') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
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
          new TextDisplayBuilder().setContent('Select what type to whitelist:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('automod_whitelist_type_user')
              .setLabel('User')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('automod_whitelist_type_role')
              .setLabel('Role')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('automod_whitelist_type_channel')
              .setLabel('Channel')
              .setStyle(ButtonStyle.Primary)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_type_user') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Add User to Whitelist')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Select a user to whitelist:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
              .setCustomId('automod_whitelist_add_user')
              .setPlaceholder('Select user')
              .setMinValues(1)
              .setMaxValues(1)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_type_role') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Add Role to Whitelist')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Select a role to whitelist:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId('automod_whitelist_add_role')
              .setPlaceholder('Select role')
              .setMinValues(1)
              .setMaxValues(1)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_type_channel') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Add Channel to Whitelist')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Select a channel to whitelist:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('automod_whitelist_add_channel')
              .setPlaceholder('Select channel')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(1)
              .setMaxValues(1)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_remove_btn') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const whitelist = await AutomodWhitelist.findAll({ where: { guildId: interaction.guild.id } });

      if (whitelist.length === 0) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('The whitelist is empty.')
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const options = whitelist.slice(0, 25).map(w => {
        const typeLabel = w.targetType === 'user' ? 'User' : w.targetType === 'role' ? 'Role' : 'Channel';
        return {
          label: `${typeLabel}: ${w.targetId}`,
          value: w.targetId,
          description: `Remove ${typeLabel.toLowerCase()} from whitelist`
        };
      });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Remove from Whitelist')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Select an entry to remove:')
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('automod_whitelist_remove')
              .setPlaceholder('Select entry to remove')
              .addOptions(options)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_whitelist_list_btn') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const whitelist = await AutomodWhitelist.findAll({ where: { guildId: interaction.guild.id } });
      const MODULES = AutomodWhitelist.MODULES;

      if (whitelist.length === 0) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### AutoMod Whitelist')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('No entries in the whitelist.')
          );
        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let detailedContent = '';
      for (const w of whitelist) {
        const modules = w.getModules();
        let moduleList;
        if (!modules || modules.length === 0) {
          moduleList = '`All Modules`';
        } else {
          moduleList = modules.map(m => `\`${MODULES[m] || m}\``).join(', ');
        }

        let mention;
        if (w.targetType === 'user') mention = `<@${w.targetId}>`;
        else if (w.targetType === 'role') mention = `<@&${w.targetId}>`;
        else mention = `<#${w.targetId}>`;

        detailedContent += `${mention}\n${moduleList}\n\n`;
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### AutoMod Whitelist - Detailed (${whitelist.length})`)
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
              .setCustomId('automod_whitelist_add_btn')
              .setLabel('Add')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('automod_whitelist_remove_btn')
              .setLabel('Remove')
              .setStyle(ButtonStyle.Danger)
          )
        );

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (id === 'automod_setup_modules') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (!interaction.client.automodSetup) interaction.client.automodSetup = new Map();

      const selectedModules = interaction.values && interaction.values.length > 0 ? interaction.values : null;

      interaction.client.automodSetup.set(interaction.user.id, {
        guildId: interaction.guild.id,
        selectedModules: selectedModules || []
      });

      if (!selectedModules) {
        return interaction.deferUpdate();
      }

      const setupModule = require('../../hybrid/automod/subcommands/setup');
      await setupModule.step2(interaction, selectedModules);
      return true;
    }

    if (id.startsWith('automod_punishment_')) {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const moduleKey = id.replace('automod_punishment_', '');
      const punishment = interaction.values[0];
      const punishmentFieldKey = moduleKey + 'Punishment';

      await AutomodConfig.update(
        { [punishmentFieldKey]: punishment },
        { where: { guildId: interaction.guild.id } }
      );

      return interaction.deferUpdate();
    }

    if (id === 'automod_whitelist_remove') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const targetId = interaction.values[0];
      const deleted = await AutomodWhitelist.destroy({
        where: { guildId: interaction.guild.id, targetId }
      });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            deleted
              ? `Entry \`${targetId}\` has been removed from the whitelist.`
              : 'Entry not found in the whitelist.'
          )
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id === 'automod_whitelist_add_channel') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) return interaction.deferUpdate();

      const [entry, created] = await AutomodWhitelist.findOrCreate({
        where: { guildId: interaction.guild.id, targetId: selectedChannel.id },
        defaults: { guildId: interaction.guild.id, targetId: selectedChannel.id, targetType: 'channel' }
      });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            created
              ? `Channel <#${selectedChannel.id}> has been added to the whitelist.`
              : `Channel <#${selectedChannel.id}> is already whitelisted.`
          )
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (id === 'automod_setup_logs') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedChannel = interaction.channels.first();
      const channelId = selectedChannel?.id || null;

      await AutomodConfig.update({ logChannelId: channelId }, { where: { guildId: interaction.guild.id } });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# AutoMod Setup\n**Step 3 of 3** - Configure Thresholds')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Select a log channel for automod actions:\n\n` +
            (selectedChannel ? `✅ **Log channel set to:** <#${channelId}>` : '⚠️ **No channel selected** — logs will be disabled.')
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('automod_setup_logs')
              .setPlaceholder(selectedChannel ? `#${selectedChannel.name}` : 'Select log channel')
              .setChannelTypes(ChannelType.GuildText)
              .setMinValues(0)
              .setMaxValues(1)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('automod_setup_complete')
              .setLabel('Complete Setup')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('automod_setup_back')
              .setLabel('Back')
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
    if (id === 'automod_whitelist_add_user') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedUser = interaction.users.first();
      if (!selectedUser) return interaction.deferUpdate();

      const [entry, created] = await AutomodWhitelist.findOrCreate({
        where: { guildId: interaction.guild.id, targetId: selectedUser.id },
        defaults: { guildId: interaction.guild.id, targetId: selectedUser.id, targetType: 'user' }
      });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            created
              ? `${selectedUser.username} has been added to the whitelist.`
              : `${selectedUser.username} is already whitelisted.`
          )
        );
      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }

  if (interaction.isRoleSelectMenu()) {
    if (id === 'automod_whitelist_add_role') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({
          content: 'You need **Manage Server** permission.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedRole = interaction.roles.first();
      if (!selectedRole) return interaction.deferUpdate();

      const [entry, created] = await AutomodWhitelist.findOrCreate({
        where: { guildId: interaction.guild.id, targetId: selectedRole.id },
        defaults: { guildId: interaction.guild.id, targetId: selectedRole.id, targetType: 'role' }
      });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            created
              ? `Role **${selectedRole.name}** has been added to the whitelist.`
              : `Role **${selectedRole.name}** is already whitelisted.`
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
