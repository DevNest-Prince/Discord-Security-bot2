


const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ChannelType,
    ActionRowBuilder,
    ChannelSelectMenuBuilder
} = require('discord.js');
const { J2CConfig } = require('../../../../database/models');
const VoiceControlView = require('../../../utils/j2cView');
const emojis = require('../../../emojis.json');

module.exports = {
    name: 'setup',
    description: 'Setup the Join to Create system',

    async execute(interactionOrMessage, args = []) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('Administrator')) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('You need Administrator permission to use this command.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const existing = await J2CConfig.findOne({ where: { guildId: guild.id } });
        if (existing?.voiceChannelId) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Already Configured'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Use `j2c config` to modify or `j2c reset` to start over.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# Join to Create Setup\n**Step 1 of 3**')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Select the **text channel** where the control panel will be posted:')
            )
            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('j2c_setup_text')
                            .setPlaceholder('Select control panel text channel')
                            .setChannelTypes(ChannelType.GuildText)
                    )
            );

        await interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    },

    async sendControlPanel(textChannel) {
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**Voicemaster Interface**')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addSectionComponents(
                new (require('discord.js').SectionBuilder)()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Use the buttons below to control your voice channel.')
                    )
                    .setThumbnailAccessory(
                        new (require('discord.js').ThumbnailBuilder)().setURL(textChannel.client.user.displayAvatarURL({ size: 128 }))
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Button Usage**\n${emojis.j2c_lock} - Lock the voice channel\n${emojis.j2c_unlock} - Unlock the voice channel\n${emojis.j2c_hide} - Hide the voice channel\n${emojis.j2c_unhide} - Unhide the voice channel\n${emojis.j2c_claim} - Claim ownership of a voice channel\n${emojis.j2c_disconnect} - Disconnect a member from your VC\n${emojis.j2c_activity} - View voice activities\n${emojis.j2c_info} - View channel information\n${emojis.j2c_increase} - Increase user limit\n${emojis.j2c_decrease} - Decrease user limit`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addActionRowComponents(...VoiceControlView.getComponents());

        await textChannel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
