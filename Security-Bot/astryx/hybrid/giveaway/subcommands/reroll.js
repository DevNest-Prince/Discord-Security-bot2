


const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const Giveaway = require('../../../../database/models/Giveaway');
const GiveawayEntry = require('../../../../database/models/GiveawayEntry');
const emojis = require('../../../emojis.json');

module.exports = {
  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();
    const member = interactionOrMessage.member;

    if (!member.permissions.has('ManageGuild')) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Permission Denied**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('You need `Manage Server` permission to reroll giveaways!')
      );

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    let targetMessageId;

    if (isSlash) {
      targetMessageId = interactionOrMessage.options.getString('message_id');
    } else {
      if (interactionOrMessage.reference?.messageId) {
        targetMessageId = interactionOrMessage.reference.messageId;
      } else if (args[0]) {
        targetMessageId = args[0];
      } else {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**No Message Found**')
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Reply to a giveaway message or provide message ID!')
        );

        return interactionOrMessage.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }

    const giveaway = await Giveaway.findOne({
      where: {
        messageId: targetMessageId,
        ended: true
      }
    });

    if (!giveaway) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Not Found**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('No ended giveaway found for this message!')
      );

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const entries = await GiveawayEntry.findAll({
      where: { giveawayId: giveaway.id }
    });

    if (!entries || entries.length === 0) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**No Entries**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('No entries found to reroll!')
      );

      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const winnerCount = Math.min(giveaway.winners, entries.length);
    const winners = [];
    const availableEntries = [...entries];

    for (let i = 0; i < winnerCount; i++) {
      const randomIndex = Math.floor(Math.random() * availableEntries.length);
      winners.push(availableEntries.splice(randomIndex, 1)[0]);
    }

    const winnerLinks = [];
    for (const winner of winners) {
      try {
        const user = await interactionOrMessage.client.users.fetch(winner.userId);
        winnerLinks.push(`<@${user.id}>`);
      } catch {
        winnerLinks.push(`<@${winner.userId}>`);
      }
    }

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${emojis.gift || '🎁'} **New Winners!** ${emojis.gift || '🎁'}`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Prize:** ${giveaway.prize}\n` +
        `**New Winners:** ${winnerLinks.join(', ')}\n\n` +
        `${emojis.giveawayyes} Congratulations! 🎊`
      )
    );

    const giveawayMessage = await interactionOrMessage.channel.messages.fetch(targetMessageId).catch(() => null);

    if (giveawayMessage) {
      const giveawayLinkButton = new ButtonBuilder()
        .setLabel('Giveaway Link')
        .setStyle(ButtonStyle.Link)
        .setURL(giveawayMessage.url);

      const buttonRow = new ActionRowBuilder().addComponents(giveawayLinkButton);
      container.addActionRowComponents(buttonRow);
    }

    await interactionOrMessage.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: winners.map(w => w.userId) }
    });

    await interactionOrMessage.reply({
      components: [new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Reroll Complete**')
      ).addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      ).addTextDisplayComponents(
        new TextDisplayBuilder().setContent('New winners have been selected!')
      )],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });

    for (const winner of winners) {
      try {
        const user = await interactionOrMessage.client.users.fetch(winner.userId);
        const dmContainer = new ContainerBuilder();
        dmContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.giveawayyes} You won **${giveaway.prize}** in **${interactionOrMessage.guild.name}** ${emojis.heart || '❤️'}`)
        );

        if (giveawayMessage) {
          const jumpButton = new ButtonBuilder()
            .setLabel('View Winning Message')
            .setStyle(ButtonStyle.Link)
            .setURL(giveawayMessage.url);

          const buttonRow = new ActionRowBuilder().addComponents(jumpButton);
          dmContainer.addActionRowComponents(buttonRow);
        }

        await user.send({
          components: [dmContainer],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (e) {
        console.error(`Failed to DM reroll winner ${winner.userId}:`, e);
      }
    }
  }
};
