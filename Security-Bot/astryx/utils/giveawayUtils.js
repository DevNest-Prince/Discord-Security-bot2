


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
const Giveaway = require('../../database/models/Giveaway');
const GiveawayEntry = require('../../database/models/GiveawayEntry');
const emojis = require('../emojis.json');

let isChecking = false;

async function endGiveaway(client, giveaway) {
  try {
    const guild = client.guilds.cache.get(giveaway.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    const entries = await GiveawayEntry.findAll({
      where: { giveawayId: giveaway.id }
    });

    if (!entries || entries.length === 0) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${emojis.gift || '🎁'} **${giveaway.prize}** ${emojis.gift || '🎁'}`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emojis.dots || ''} **Winners:** No valid entries\n` +
          `${emojis.dots || ''} **Ended:** <t:${Math.floor(Date.now() / 1000)}:R>\n` +
          `${emojis.dots || ''} **Hosted by:** <@${giveaway.hostId}>\n\n` +
          `**Giveaway Ended!**`
        )
      );

      try {
        const msg = await channel.messages.fetch(giveaway.messageId);
        await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (e) {
        console.error('Failed to update giveaway message:', e);
      }
      return;
    }

    const winnerCount = Math.min(giveaway.winners, entries.length);
    const winners = [];
    const availableEntries = [...entries];

    for (let i = 0; i < winnerCount; i++) {
      const randomIndex = Math.floor(Math.random() * availableEntries.length);
      winners.push(availableEntries.splice(randomIndex, 1)[0]);
    }

    const winnerMentions = winners.map(w => `<@${w.userId}>`);

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${emojis.gift || '🎁'} **${giveaway.prize}** ${emojis.gift || '🎁'}`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emojis.dots || ''} **Winners:** ${winnerMentions.join(', ')}\n` +
        `${emojis.dots || ''} **Ended:** <t:${Math.floor(Date.now() / 1000)}:R>\n` +
        `${emojis.dots || ''} **Hosted by:** <@${giveaway.hostId}>\n\n` +
        `**Giveaway Ended!**`
      )
    );

    let giveawayMsg = null;
    try {
      giveawayMsg = await channel.messages.fetch(giveaway.messageId);
      await giveawayMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {
      console.error('Failed to update giveaway message:', e);
    }

    const channelContainer = new ContainerBuilder();
    channelContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emojis.giveawayyes} Congrats! ${winnerMentions.join(', ')}, you've won the **${giveaway.prize}** ${emojis.heart || '❤️'}, hosted by <@${giveaway.hostId}>`
      )
    );

    if (giveawayMsg) {
      channelContainer.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Giveaway Link').setStyle(ButtonStyle.Link).setURL(giveawayMsg.url)
        )
      );
    }

    await channel.send({
      components: [channelContainer],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: winners.map(w => w.userId) }
    });

    await Promise.all(winners.map(async (winner) => {
      try {
        const user = await client.users.fetch(winner.userId);
        const dmContainer = new ContainerBuilder();
        dmContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.giveawayyes} You won **${giveaway.prize}** in **${guild.name}** ${emojis.heart || '❤️'}`)
        );

        if (giveawayMsg) {
          dmContainer.addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setLabel('View Winning Message').setStyle(ButtonStyle.Link).setURL(giveawayMsg.url)
            )
          );
        }

        await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
      } catch (e) {
        console.error(`Failed to DM winner ${winner.userId}:`, e);
      }
    }));
  } catch (e) {
    console.error('Error ending giveaway:', e);
  }
}

async function checkGiveaways(client) {
  if (isChecking) return;
  isChecking = true;
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiredGiveaways = await Giveaway.findAll({
      where: {
        ended: false,
        endTime: { [require('sequelize').Op.lte]: now }
      }
    });

    if (expiredGiveaways.length === 0) return;

    await Promise.all(expiredGiveaways.map(async (giveaway) => {
      await endGiveaway(client, giveaway);
      await giveaway.update({ ended: true });
    }));
  } finally {
    isChecking = false;
  }
}

module.exports = {
  endGiveaway,
  checkGiveaways
};
