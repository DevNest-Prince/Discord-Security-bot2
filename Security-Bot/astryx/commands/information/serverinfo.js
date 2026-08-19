


const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ComponentType
} = require("discord.js");

const emojis = require("../../emojis.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Shows detailed information about the server"),

  async execute(interaction) {
    const guild = interaction.guild;
    let currentPage = 'general';
    let rolesPage = 0;
    let emojisPage = 0;

    const createdAt = guild.createdAt.toISOString().slice(0, 19).replace('T', ' ');
    const verificationLevels = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High' };
    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const regularEmojis = guild.emojis.cache.filter(emoji => !emoji.animated);
    const animatedEmojis = guild.emojis.cache.filter(emoji => emoji.animated);

    const allRoles = Array.from(guild.roles.cache.values()).reverse();
    const allEmojis = Array.from(guild.emojis.cache.values());
    const rolesPerPage = 20;
    const emojisPerPage = 20;
    const totalRolePages = Math.ceil(allRoles.length / rolesPerPage);
    const totalEmojiPages = Math.ceil(allEmojis.length / emojisPerPage);

    const buildGeneralContainer = async () => {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${guild.name}`)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      if (guild.description) {
        if (guild.icon) {
          container.addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**__Description__**\n${guild.description}`)
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true, size: 256 }))
              )
          );
        } else {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**__Description__**\n${guild.description}`)
          );
        }
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
      }

      let aboutContent = `**__About__**\n`;
      aboutContent += `**Name:** ${guild.name}\n`;
      aboutContent += `**ID:** ${guild.id}\n`;
      const owner = await guild.fetchOwner().catch(() => null);
      aboutContent += `**Owner:** <@${guild.ownerId}>\n`;
      aboutContent += `**Created At:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n`;
      aboutContent += `**Members:** ${guild.memberCount}`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(aboutContent)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      let statsContent = `**__General Stats__**\n`;
      statsContent += `**Verification Level:** ${verificationLevels[guild.verificationLevel] || guild.verificationLevel}\n`;
      statsContent += `**Channels:** ${guild.channels.cache.size}\n`;
      statsContent += `**Roles:** ${guild.roles.cache.size}\n`;
      statsContent += `**Boost Status:** Level ${guild.premiumTier} (Boosts: ${guild.premiumSubscriptionCount || 0})`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(statsContent)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      let channelsContent = `**__Channels__**\n`;
      channelsContent += `**Total:** ${guild.channels.cache.size}\n`;
      channelsContent += `Channels: ${textChannels} text, ${voiceChannels} voice`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(channelsContent)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      if (guild.banner) {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(guild.bannerURL({ dynamic: true, size: 1024 }))
              .setDescription(`${guild.name} Server Banner`)
          )
        );
      }

      return container;
    };

    const buildRolesContainer = (page = 0) => {
      const startIndex = page * rolesPerPage;
      const endIndex = Math.min(startIndex + rolesPerPage, allRoles.length);
      const pageRoles = allRoles.slice(startIndex, endIndex);

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Server Roles`)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      let content = `*Page ${page + 1} of ${totalRolePages} • Showing ${pageRoles.length} roles*\n\n`;

      pageRoles.forEach((role, index) => {
        const roleNumber = startIndex + index + 1;
        content += `**${roleNumber}.** \`${role.name}\` - \`${role.id}\`\n`;
      });

      content += `\n**Total Roles:** ${allRoles.length}`;

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

      return container;
    };

    const buildEmojisContainer = (page = 0) => {
      const startIndex = page * emojisPerPage;
      const endIndex = Math.min(startIndex + emojisPerPage, allEmojis.length);
      const pageEmojis = allEmojis.slice(startIndex, endIndex);

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Server Emojis`)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      let content = `*Page ${page + 1} of ${totalEmojiPages} • Showing ${pageEmojis.length} emojis*\n\n`;

      pageEmojis.forEach((emoji, index) => {
        const emojiNumber = startIndex + index + 1;
        content += `**${emojiNumber}.** ${emoji} - \`${emoji.name}\` ${emoji.animated ? '(Animated)' : ''}\n`;
      });

      content += `\n**Total Emojis:** ${allEmojis.length}`;

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

      return container;
    };

    const createDropdown = () => {
      return new StringSelectMenuBuilder()
        .setCustomId('serverinfo_select')
        .setPlaceholder('Choose information to view')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('General Information')
            .setDescription('Basic server information and statistics')
            .setValue('general'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Server Roles')
            .setDescription(`View all ${allRoles.length} server roles with pagination`)
            .setValue('roles'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Server Emojis')
            .setDescription(`View all ${allEmojis.length} server emojis with pagination`)
            .setValue('emojis')
        );
    };

    const createPaginationButtons = () => {
      const row = new ActionRowBuilder();

      if (currentPage === 'roles') {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('roles_first')
            .setEmoji(emojis.firstPage)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(rolesPage === 0),
          new ButtonBuilder()
            .setCustomId('roles_prev')
            .setEmoji(emojis.prev)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(rolesPage === 0),
          new ButtonBuilder()
            .setCustomId('roles_next')
            .setEmoji(emojis.next)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(rolesPage >= totalRolePages - 1),
          new ButtonBuilder()
            .setCustomId('roles_last')
            .setEmoji(emojis.lastPage)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(rolesPage >= totalRolePages - 1)
        );
      } else if (currentPage === 'emojis') {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('emojis_first')
            .setEmoji(emojis.firstPage)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(emojisPage === 0),
          new ButtonBuilder()
            .setCustomId('emojis_prev')
            .setEmoji(emojis.prev)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(emojisPage === 0),
          new ButtonBuilder()
            .setCustomId('emojis_next')
            .setEmoji(emojis.next)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(emojisPage >= totalEmojiPages - 1),
          new ButtonBuilder()
            .setCustomId('emojis_last')
            .setEmoji(emojis.lastPage)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(emojisPage >= totalEmojiPages - 1)
        );
      }

      return row;
    };

    const addMenuToContainer = (container) => {
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(createDropdown())
      );

      const buttons = createPaginationButtons();
      if (buttons.components.length > 0) {
        container.addActionRowComponents(buttons);
      }

      return container;
    };

    const getCurrentContainer = async () => {
      let container;
      switch (currentPage) {
        case 'roles':
          container = buildRolesContainer(rolesPage);
          break;
        case 'emojis':
          container = buildEmojisContainer(emojisPage);
          break;
        default:
          container = await buildGeneralContainer();
          break;
      }
      return addMenuToContainer(container);
    };

    const finalContainer = await getCurrentContainer();

    const response = await interaction.reply({
      components: [finalContainer],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: [] }
    });

    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
      time: 300000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "You cannot interact with this message.",
          ephemeral: true
        });
      }

      if (i.customId === 'serverinfo_select') {
        currentPage = i.values[0];
        rolesPage = 0;
        emojisPage = 0;
      } else if (i.customId.startsWith('roles_')) {
        const action = i.customId.split('_')[1];
        switch (action) {
          case 'first': rolesPage = 0; break;
          case 'prev': rolesPage = Math.max(0, rolesPage - 1); break;
          case 'next': rolesPage = Math.min(totalRolePages - 1, rolesPage + 1); break;
          case 'last': rolesPage = totalRolePages - 1; break;
        }
      } else if (i.customId.startsWith('emojis_')) {
        const action = i.customId.split('_')[1];
        switch (action) {
          case 'first': emojisPage = 0; break;
          case 'prev': emojisPage = Math.max(0, emojisPage - 1); break;
          case 'next': emojisPage = Math.min(totalEmojiPages - 1, emojisPage + 1); break;
          case 'last': emojisPage = totalEmojiPages - 1; break;
        }
      }

      const newContainer = await getCurrentContainer();

      await i.update({
        components: [newContainer],
        flags: MessageFlags.IsComponentsV2
      });
    });

    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch (error) {
        console.error('[SERVERINFO] Failed to update message on timeout:', error.message);
      }
    });
  }
};
