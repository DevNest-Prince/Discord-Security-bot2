


const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { getNekoGif, hasNekoEndpoint } = require("./nekoHelper");
const { getRandomTenorGif } = require("./gifHelper");

const roleplayActions = {
  hug: {
    title: "Hug Time",
    nekoAction: "hug",
    tenorSearch: "anime hug",
    message: (actor, target) => `**${actor.username}** gives **${target.username}** a warm hug`,
    buttonLabel: "Hug Back",
    buttonStyle: ButtonStyle.Primary
  },
  pat: {
    title: "Pat Pat",
    nekoAction: "pat",
    tenorSearch: "anime pat head",
    message: (actor, target) => `**${actor.username}** pats **${target.username}** on the head`,
    buttonLabel: "Pat Back",
    buttonStyle: ButtonStyle.Primary
  },
  kiss: {
    title: "Kiss",
    nekoAction: "kiss",
    tenorSearch: "anime kiss",
    message: (actor, target) => `**${actor.username}** kisses **${target.username}**`,
    buttonLabel: "Kiss Back",
    buttonStyle: ButtonStyle.Danger
  },
  slap: {
    title: "Slap",
    nekoAction: "slap",
    tenorSearch: "anime slap",
    message: (actor, target) => `**${actor.username}** slaps **${target.username}**`,
    buttonLabel: "Slap Back",
    buttonStyle: ButtonStyle.Danger
  },
  poke: {
    title: "Poke",
    nekoAction: "poke",
    tenorSearch: "anime poke",
    message: (actor, target) => `**${actor.username}** pokes **${target.username}**`,
    buttonLabel: "Poke Back",
    buttonStyle: ButtonStyle.Primary
  },
  tickle: {
    title: "Tickle Attack",
    nekoAction: "tickle",
    tenorSearch: "anime tickle",
    message: (actor, target) => `**${actor.username}** tickles **${target.username}**`,
    buttonLabel: "Tickle Back",
    buttonStyle: ButtonStyle.Primary
  },
  kill: {
    title: "Kill Action",
    nekoAction: "kill",
    tenorSearch: "anime kill",
    message: (actor, target) => `**${actor.username}** eliminates **${target.username}**`,
    buttonLabel: "Fight Back",
    buttonStyle: ButtonStyle.Danger
  },
  lick: {
    title: "Lick",
    nekoAction: null,
    tenorSearch: "anime lick",
    message: (actor, target) => `**${actor.username}** licks **${target.username}**`,
    buttonLabel: "Lick Back",
    buttonStyle: ButtonStyle.Primary
  },
  deathstare: {
    title: "Death Stare",
    nekoAction: "deathstare",
    tenorSearch: "anime death stare",
    message: (actor, target) => `**${actor.username}** gives **${target.username}** a deadly stare`,
    buttonLabel: "Stare Back",
    buttonStyle: ButtonStyle.Danger
  }
};

async function buildRoleplayResponse(action, actor, target, includeButton = true) {
  const actionConfig = roleplayActions[action];
  if (!actionConfig) {
    console.error(`Unknown roleplay action: ${action}`);
    return null;
  }

  try {
    let gifUrl;
    if (actionConfig.nekoAction && hasNekoEndpoint(actionConfig.nekoAction)) {
      gifUrl = await getNekoGif(actionConfig.nekoAction);
    } else {
      gifUrl = await getRandomTenorGif(actionConfig.tenorSearch);
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${actionConfig.title}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

    if (gifUrl) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems([
          new MediaGalleryItemBuilder().setURL(gifUrl)
        ])
      );
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(actionConfig.message(actor, target))
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    if (includeButton) {
      const respondButton = new ButtonBuilder()
        .setCustomId(`${action}_back_${actor.id}_${target.id}`)
        .setLabel(actionConfig.buttonLabel)
        .setStyle(actionConfig.buttonStyle);

      const buttonRow = new ActionRowBuilder().addComponents(respondButton);
      container.addActionRowComponents(buttonRow);
    }

    return container;
  } catch (error) {
    console.error(`Error building roleplay response for ${action}:`, error);
    return null;
  }
}

module.exports = { buildRoleplayResponse, roleplayActions };
