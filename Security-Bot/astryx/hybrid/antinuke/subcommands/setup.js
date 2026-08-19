


const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { AntinukeConfig } = require('../../../../database/models');

module.exports = {
    name: 'setup',
    description: 'Setup antinuke with interactive wizard',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (guild.ownerId !== member.id) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Only the **Server Owner** can setup antinuke.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const existingConfig = await AntinukeConfig.findOne({ where: { guildId: guild.id } });
        if (existingConfig) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Already Configured'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Use `antinuke settings` to modify or `antinuke disable` to reset.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const [config] = await AntinukeConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# Antinuke Setup\n**Step 1 of 3** - Select Modules')
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
                        .setCustomId('antinuke_setup_modules')
                        .setPlaceholder('Select modules to enable')
                        .setMinValues(0)
                        .setMaxValues(19)
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Ban')
                                .setDescription('Prevent mass banning of members')
                                .setValue('antiBan')
                                .setDefault(config.antiBan),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Kick')
                                .setDescription('Prevent mass kicking of members')
                                .setValue('antiKick')
                                .setDefault(config.antiKick),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Bot')
                                .setDescription('Prevent unauthorized bot additions')
                                .setValue('antiBot')
                                .setDefault(config.antiBot),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Channel Create')
                                .setDescription('Prevent mass channel creation')
                                .setValue('antiChannelCreate')
                                .setDefault(config.antiChannelCreate),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Channel Delete')
                                .setDescription('Prevent mass channel deletion')
                                .setValue('antiChannelDelete')
                                .setDefault(config.antiChannelDelete),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Channel Update')
                                .setDescription('Prevent mass channel modifications')
                                .setValue('antiChannelEdit')
                                .setDefault(config.antiChannelEdit),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Everyone/Here')
                                .setDescription('Prevent @everyone/@here mention spam')
                                .setValue('antiEveryoneMention')
                                .setDefault(config.antiEveryoneMention),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Role Create')
                                .setDescription('Prevent mass role creation')
                                .setValue('antiRoleCreate')
                                .setDefault(config.antiRoleCreate),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Role Delete')
                                .setDescription('Prevent mass role deletion')
                                .setValue('antiRoleDelete')
                                .setDefault(config.antiRoleDelete),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Role Update')
                                .setDescription('Prevent dangerous permission grants')
                                .setValue('antiRoleUpdate')
                                .setDefault(config.antiRoleUpdate),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Member Update')
                                .setDescription('Prevent granting dangerous roles to members')
                                .setValue('antiMemberUpdate')
                                .setDefault(config.antiMemberUpdate),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Guild Update')
                                .setDescription('Prevent mass server setting changes')
                                .setValue('antiGuildUpdate')
                                .setDefault(config.antiGuildUpdate),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Integration')
                                .setDescription('Prevent unauthorized app/integration additions')
                                .setValue('antiIntegration')
                                .setDefault(config.antiIntegration),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Webhook Create')
                                .setDescription('Prevent unauthorized webhook creation')
                                .setValue('antiWebhookCreate')
                                .setDefault(config.antiWebhookCreate),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Webhook Delete')
                                .setDescription('Prevent unauthorized webhook deletion')
                                .setValue('antiWebhookDelete')
                                .setDefault(config.antiWebhookDelete),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Webhook Update')
                                .setDescription('Prevent unauthorized webhook modification')
                                .setValue('antiWebhookUpdate')
                                .setDefault(config.antiWebhookUpdate),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Prune')
                                .setDescription('Prevent mass inactive-member pruning')
                                .setValue('antiPrune')
                                .setDefault(config.antiPrune),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Emoji')
                                .setDescription('Prevent emoji creation/deletion/modification')
                                .setValue('antiEmoji')
                                .setDefault(config.antiEmoji),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Auto Recovery')
                                .setDescription('Restore deleted & remove attacker-created channels/roles/webhooks')
                                .setValue('autoRecovery')
                                .setDefault(config.autoRecovery)
                        )
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('antinuke_setup_next_1')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('antinuke_setup_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
};
