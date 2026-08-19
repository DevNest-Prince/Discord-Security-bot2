


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
const { AutomodConfig } = require('../../../../database/models');

module.exports = {
    name: 'setup',
    description: 'Setup automod with interactive wizard',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('You need **Manage Server** permission to setup automod.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const [config] = await AutomodConfig.findOrCreate({ where: { guildId: guild.id }, defaults: { guildId: guild.id } });

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# AutoMod Setup\n**Step 1 of 3** - Select Modules')
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
                        .setCustomId('automod_setup_modules')
                        .setPlaceholder('Select modules to enable')
                        .setMinValues(0)
                        .setMaxValues(7)
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Spam')
                                .setDescription('Rate limit messages to prevent spam')
                                .setValue('antiSpam')
                                .setDefault(config.antiSpam),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Link')
                                .setDescription('Block all external links')
                                .setValue('antiLink')
                                .setDefault(config.antiLink),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Invite')
                                .setDescription('Block Discord invite links')
                                .setValue('antiInvite')
                                .setDefault(config.antiInvite),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Bad Words')
                                .setDescription('Filter banned words')
                                .setValue('antiBadWords')
                                .setDefault(config.antiBadWords),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Mass Mention')
                                .setDescription('Limit mentions per message')
                                .setValue('antiMassMention')
                                .setDefault(config.antiMassMention),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Caps')
                                .setDescription('Block excessive capital letters')
                                .setValue('antiCaps')
                                .setDefault(config.antiCaps)
                        ,
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Anti-Ping')
                                .setDescription('Block @everyone / @here pings')
                                .setValue('antiPing')
                                .setDefault(config.antiPing)
                        )
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('automod_setup_next_1')
                        .setLabel('Configure Punishments')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('automod_setup_cancel')
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

module.exports.step2 = async function(interactionOrMessage, selectedModules) {
    const member = interactionOrMessage.member;
    const guild = interactionOrMessage.guild;
    const config = await AutomodConfig.findOne({ where: { guildId: guild.id } });

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# AutoMod Setup\n**Step 2 of 3** - Configure Punishments')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Set punishment type for each enabled module:')
        );


    const modules = [
        { key: 'antiSpam', name: 'Anti-Spam', label: 'antiSpamPunishment' },
        { key: 'antiLink', name: 'Anti-Link', label: 'antiLinkPunishment' },
        { key: 'antiInvite', name: 'Anti-Invite', label: 'antiInvitePunishment' },
        { key: 'antiBadWords', name: 'Anti-Bad Words', label: 'antiBadWordsPunishment' },
        { key: 'antiMassMention', name: 'Anti-Mass Mention', label: 'antiMassMentionPunishment' },
        { key: 'antiCaps', name: 'Anti-Caps', label: 'antiCapsPunishment' },
        { key: 'antiPing', name: 'Anti-Ping', label: 'antiPingPunishment' }
    ];

    for (const mod of modules) {
        if (selectedModules.includes(mod.key)) {
            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`automod_punishment_${mod.key}`)
                        .setPlaceholder(`${mod.name} Punishment`)
                        .addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Delete Message')
                                .setValue('delete')
                                .setDefault(config[mod.label] === 'delete'),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Delete & Warn')
                                .setValue('warn')
                                .setDefault(config[mod.label] === 'warn'),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Mute User')
                                .setValue('mute')
                                .setDefault(config[mod.label] === 'mute'),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Kick User')
                                .setValue('kick')
                                .setDefault(config[mod.label] === 'kick'),
                            new StringSelectMenuOptionBuilder()
                                .setLabel('Ban User')
                                .setValue('ban')
                                .setDefault(config[mod.label] === 'ban')
                        )
                )
            );
        }
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('automod_setup_next_2')
                .setLabel('Continue')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('automod_setup_back')
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('automod_setup_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
        )
    );

    return interactionOrMessage.update ? interactionOrMessage.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    }) : interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
};

module.exports.step3 = async function(interactionOrMessage) {
    const config = await AutomodConfig.findOne({ where: { guildId: interactionOrMessage.guild.id } });

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# AutoMod Setup\n**Step 3 of 3** - Configure Thresholds')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Current Thresholds:**\n` +
                `Spam: ${config.spamThreshold} msgs / ${config.spamInterval}s\n` +
                `Mentions: ${config.mentionLimit} max\n` +
                `Caps: ${config.capsPercentage}% max\n\n` +
                `These can be adjusted in the dashboard or via \`/automod settings\` command.`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('automod_setup_complete')
                    .setLabel('Complete Setup')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('automod_setup_back')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

    return interactionOrMessage.update ? interactionOrMessage.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    }) : interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
};
