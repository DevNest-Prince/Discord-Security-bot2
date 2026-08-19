


const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  ComponentType
} = require("discord.js");

const emojis = require("../../emojis.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Shows detailed information about a user")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The user to get information about")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const user = targetUser;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const userCreated = Math.floor(user.createdTimestamp / 1000);
    const memberJoined = member ? Math.floor(member.joinedTimestamp / 1000) : null;

    const presence = member?.presence;
    const status = presence?.status || 'offline';
    const activities = presence?.activities || [];

    const roles = member ? member.roles.cache.filter(r => r.id !== interaction.guild.id) : null;
    const roleCount = roles ? roles.size : 0;
    const highestRole = member?.roles.highest;

    const permissions = member?.permissions.toArray() || [];
    const keyPermissions = permissions.filter(p =>
      ['Administrator', 'ManageGuild', 'ManageChannels', 'ManageMessages', 'ManageRoles', 'BanMembers', 'KickMembers'].includes(p)
    );

    const statusEmojis = {
      online: emojis.online,
      idle: emojis.idle,
      dnd: emojis.dnd,
      offline: emojis.offline
    };

    const buildUserOverviewContainer = () => {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${emojis.user} ${user.username} Information`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`## ${emojis.clipboard} Basic Information`),
              new TextDisplayBuilder().setContent(`**Username**: ${user.username}\n**Display Name**: ${user.displayName || user.username}\n**User ID**: ${user.id}\n**Account Created**: <t:${userCreated}:F> (<t:${userCreated}:R>)`)
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 128 }))
            )
        );

      if (member) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emojis.house} Server Information`),
            new TextDisplayBuilder().setContent(`**Joined Server**: <t:${memberJoined}:F> (<t:${memberJoined}:R>)\n**Server Nickname**: ${member.nickname || 'None'}\n**Status**: ${statusEmojis[status]} ${status.charAt(0).toUpperCase() + status.slice(1)}\n**Role Count**: ${roleCount}`)
          );

        if (highestRole && highestRole.id !== interaction.guild.id) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Highest Role**: ${highestRole.name}`)
          );
        }
      }

      return container;
    };

    const buildRolesContainer = () => {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${emojis.masks} ${user.username} Roles\n*Server roles and permissions*`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

      if (!member) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${emojis.cross} Not a Server Member\n*This user is not a member of this server.*`)
        );
        return container;
      }

      if (roleCount === 0) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${emojis.memo} Roles\n*This user has no roles assigned.*`)
        );
      } else {
        const roleList = roles.sort((a, b) => b.position - a.position).map(role => `@${role.name}`).join(', ');
        const topRole = roles.sort((a, b) => b.position - a.position).first();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${emojis.memo} Roles (${roleCount})`),
          new TextDisplayBuilder().setContent(`**Top Role**: @${topRole.name}\n**All Roles**: ${roleList}`)
        );
      }

      if (keyPermissions.length > 0) {
        const permList = keyPermissions.map(p => p.replace(/([A-Z])/g, ' $1').trim()).join('\n');
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emojis.key} Key Permissions`),
            new TextDisplayBuilder().setContent(`\`\`\`\n${permList}\n\`\`\``)
          );
      }

      return container;
    };

    const buildActivityContainer = () => {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${emojis.fun} ${user.username} Activity\n*Current status and activities*`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${statusEmojis[status]} Current Status`),
          new TextDisplayBuilder().setContent(`**Status**: ${status.charAt(0).toUpperCase() + status.slice(1)}`)
        );

      if (activities.length > 0) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emojis.target} Activities`)
          );

        activities.slice(0, 3).forEach((activity, index) => {
          const activityTypes = {
            0: `${emojis.fun} Playing`,
            1: `${emojis.tv} Streaming`,
            2: `${emojis.microphone} Listening to`,
            3: `${emojis.tv} Watching`,
            4: `${emojis.pencil} Custom Status`,
            5: `${emojis.trophy} Competing in`
          };

          const activityType = activityTypes[activity.type] || `${emojis.question} Unknown`;
          let activityText = `**${activityType}**: ${activity.name}`;

          if (activity.details) activityText += `\n*${activity.details}*`;
          if (activity.state) activityText += `\n*${activity.state}*`;

          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(activityText)
          );

          if (index < activities.length - 1 && index < 2) {
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
          }
        });
      } else {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('*No current activities*')
        );
      }

      return container;
    };

    const addMenuToContainer = (container, currentView = 'overview') => {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
      );

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('userinfo_menu')
            .setPlaceholder('Select information category')
            .addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel('User Overview')
                .setValue('overview')
                .setDefault(currentView === 'overview'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Roles & Permissions')
                .setValue('roles')
                .setDefault(currentView === 'roles'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Activity & Status')
                .setValue('activity')
                .setDefault(currentView === 'activity')
            )
        )
      );

      return container;
    };

    const initialContainer = addMenuToContainer(buildUserOverviewContainer(), 'overview');

    if (user.bannerURL()) {
      initialContainer.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(user.bannerURL({ size: 1024 }))
            .setDescription(`${user.username}'s Banner`)
        )
      );
    }

    const response = await interaction.reply({
      components: [initialContainer],
      flags: MessageFlags.IsComponentsV2
    });

    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 180000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Only the command user can use this menu!')
          );
        return i.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }

      if (i.customId === 'userinfo_menu') {
        const value = i.values[0];

        let containerToShow;
        if (value === 'overview') {
          containerToShow = addMenuToContainer(buildUserOverviewContainer(), 'overview');
        } else if (value === 'roles') {
          containerToShow = addMenuToContainer(buildRolesContainer(), 'roles');
        } else if (value === 'activity') {
          containerToShow = addMenuToContainer(buildActivityContainer(), 'activity');
        }

        if (value === 'overview' && user.bannerURL()) {
          containerToShow.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder()
                .setURL(user.bannerURL({ size: 1024 }))
                .setDescription(`${user.username}'s Banner`)
            )
          );
        }

        await i.update({
          components: [containerToShow],
          flags: MessageFlags.IsComponentsV2
        });
      }
    });

    collector.on('end', async () => {
      try {
        const disabledContainer = buildUserOverviewContainer();
        disabledContainer.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        );
        disabledContainer.addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('userinfo_menu_disabled')
              .setPlaceholder(`${emojis.user} Menu expired`)
              .setDisabled(true)
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('Expired')
                  .setValue('expired')
              )
          )
        );

        if (user.bannerURL()) {
          disabledContainer.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder()
                .setURL(user.bannerURL({ size: 1024 }))
                .setDescription(`${user.username}'s Banner`)
            )
          );
        }

        await interaction.editReply({
          components: [disabledContainer],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {

      }
    });
  }
};
