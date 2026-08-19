


const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const config = require('../config');
const botLogger = require('../utils/botLogger');
const { isHttpUrl } = require('../utils/url');

module.exports = {
    name: 'guildCreate',

    async execute(guild, client) {
        botLogger.logGuildJoin(guild, client).catch(() => {});

        try {
            const owner = await guild.fetchOwner();
            if (!owner) return;

            const hasSupportServer = isHttpUrl(config.SUPPORT_SERVER);
            const helpText = hasSupportServer
                ? `> You can report any issues at my **[Support Server](${config.SUPPORT_SERVER})**.\n> You can use \`/help\` or \`${config.PREFIX}help\` to explore everything I can do.`
                : `> You can use \`/help\` or \`${config.PREFIX}help\` to explore everything I can do.`;

            const container = new ContainerBuilder()
                
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Thanks** for adding **${client.user.username}** to **${guild.name}**`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        helpText
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                );

            if (hasSupportServer) {
                container.addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Support Server')
                            .setStyle(ButtonStyle.Link)
                            .setURL(config.SUPPORT_SERVER)
                    )
                );
            }

            await owner.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('guildCreate DM error:', error.message);
        }
    }
};
