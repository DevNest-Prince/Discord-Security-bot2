


const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ChannelType,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ComponentType
} = require("discord.js");

const emojis = require("../../emojis.json");
const { createPaginationSession } = require("../../utils/pagination");

module.exports = {
  name: "serverinfo",
  description: "Shows detailed information about the server",
  aliases: ["sinfo", "si"],

  async execute(message, args) {
    const guild = message.guild;
    let currentView = 'general';
    let activeSession = null;

    const createdAt = guild.createdAt.toISOString().slice(0, 19).replace('T', ' ');
    const verificationLevels = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High' };
    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;

    const allRoles = Array.from(guild.roles.cache.values()).reverse();
    const allEmojis = Array.from(guild.emojis.cache.values());
    const rolesPerPage = 20;
    const emojisPerPage = 20;
    const totalRolePages = Math.ceil(allRoles.length / rolesPerPage) || 1;
    const totalEmojiPages = Math.ceil(allEmojis.length / emojisPerPage) || 1;

    const buildGeneralContainer = () => {
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

    const addMenuToContainer = (container) => {
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(createDropdown())
      );
      return container;
    };

    const renderRolesPage = async (pageIndex, pageData, state) => {
      const startIndex = pageIndex * rolesPerPage;
      const endIndex = Math.min(startIndex + rolesPerPage, allRoles.length);
      const pageRoles = allRoles.slice(startIndex, endIndex);

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Server Roles`)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      let content = `*Page ${pageIndex + 1} of ${totalRolePages} • Showing ${pageRoles.length} roles*\n\n`;

      pageRoles.forEach((role, index) => {
        const roleNumber = startIndex + index + 1;
        content += `**${roleNumber}.** \`${role.name}\` - \`${role.id}\`\n`;
      });

      content += `\n**Total Roles:** ${allRoles.length}`;

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(createDropdown())
      );

      return container;
    };

    const renderEmojisPage = async (pageIndex, pageData, state) => {
      const startIndex = pageIndex * emojisPerPage;
      const endIndex = Math.min(startIndex + emojisPerPage, allEmojis.length);
      const pageEmojis = allEmojis.slice(startIndex, endIndex);

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Server Emojis`)
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      let content = `*Page ${pageIndex + 1} of ${totalEmojiPages} • Showing ${pageEmojis.length} emojis*\n\n`;

      pageEmojis.forEach((emoji, index) => {
        const emojiNumber = startIndex + index + 1;
        content += `**${emojiNumber}.** ${emoji} - \`${emoji.name}\` ${emoji.animated ? '(Animated)' : ''}\n`;
      });

      content += `\n**Total Emojis:** ${allEmojis.length}`;

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(createDropdown())
      );

      return container;
    };

    const generalContainer = addMenuToContainer(buildGeneralContainer());

    const response = await message.reply({
      components: [generalContainer],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: [] }
    });

    const dropdownCollector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000
    });

    dropdownCollector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "You cannot interact with this message.",
          ephemeral: true
        });
      }

      const selectedView = interaction.values[0];
      currentView = selectedView;

      if (activeSession) {
        activeSession.stop();
        activeSession = null;
      }

      if (selectedView === 'general') {
        const container = addMenuToContainer(buildGeneralContainer());
        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } else if (selectedView === 'roles') {
        await interaction.deferUpdate();

        activeSession = createPaginationSession({
          interactionOrMessage: response,
          pages: async (pageIndex) => pageIndex,
          renderPage: renderRolesPage,
          userId: message.author.id,
          totalPages: totalRolePages,
          initialPage: 0,
          timeout: 300000,
          useEdit: true
        });

        await activeSession.renderInitial();
      } else if (selectedView === 'emojis') {
        await interaction.deferUpdate();

        activeSession = createPaginationSession({
          interactionOrMessage: response,
          pages: async (pageIndex) => pageIndex,
          renderPage: renderEmojisPage,
          userId: message.author.id,
          totalPages: totalEmojiPages,
          initialPage: 0,
          timeout: 300000,
          useEdit: true
        });

        await activeSession.renderInitial();
      }
    });

    dropdownCollector.on('end', () => {
      if (activeSession) {
        activeSession.stop();
      }
      response.edit({ components: [] }).catch(() => {});
    });
  }
};
