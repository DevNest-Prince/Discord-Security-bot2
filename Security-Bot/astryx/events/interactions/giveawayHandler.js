


const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');
const Giveaway = require('../../../database/models/Giveaway');
const GiveawayEntry = require('../../../database/models/GiveawayEntry');
const emojis = require('../../emojis.json');
const { createPaginationSession } = require('../../utils/pagination');

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id.startsWith('giveaway_enter_')) {
      const giveawayId = parseInt(id.replace('giveaway_enter_', ''));
      const giveaway = await Giveaway.findByPk(giveawayId);

      if (!giveaway || giveaway.ended) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**Giveaway Ended**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('This giveaway has already ended!')
        );

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const existingEntry = await GiveawayEntry.findOne({
        where: {
          giveawayId: giveaway.id,
          userId: interaction.user.id
        }
      });

      if (existingEntry) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**Already Entered**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('You have already entered this giveaway!')
        );

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      await GiveawayEntry.create({
        giveawayId: giveaway.id,
        userId: interaction.user.id
      });

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Entry Confirmed**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${emojis.giveawayyes} You have successfully entered the giveaway!`)
      );

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (id.startsWith('giveaway_participants_')) {
      const giveawayId = parseInt(id.replace('giveaway_participants_', ''));
      const giveaway = await Giveaway.findByPk(giveawayId);

      if (!giveaway) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**Giveaway Not Found**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('This giveaway no longer exists!')
        );

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const entries = await GiveawayEntry.findAll({
        where: { giveawayId: giveaway.id }
      });

      if (entries.length === 0) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**No Participants Yet**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('No one has entered this giveaway yet!')
        );

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const itemsPerPage = 7;
      const pages = [];
      for (let i = 0; i < entries.length; i += itemsPerPage) {
        pages.push(entries.slice(i, i + itemsPerPage));
      }

      const paginationSession = createPaginationSession({
        interactionOrMessage: interaction,
        pages: pages,
        renderPage: (pageIndex, pageData, state) => {
          const container = new ContainerBuilder();

          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Giveaway Participants [${entries.length}]**`)
          );
          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );

          const participantList = pageData.map((entry, idx) => {
            const globalIdx = pageIndex * itemsPerPage + idx + 1;
            return `\`${globalIdx}.\` <@${entry.userId}>`;
          }).join('\n');

          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(participantList)
          );

          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );

          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Prize:** ${giveaway.prize}\n**Total Entries:** ${entries.length}`)
          );

          return container;
        },
        userId: interaction.user.id,
        timeout: 300000,
        ephemeral: true
      });

      await paginationSession.renderInitial();
      return true;
    }
  }

  return false;
}

module.exports = { handle };
