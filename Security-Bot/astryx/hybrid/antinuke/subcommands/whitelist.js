


const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const { AntinukeWhitelist } = require('../../../../database/models');

const EVENTS = AntinukeWhitelist.EVENTS;

module.exports = {
    name: 'whitelist',
    description: 'Manage whitelisted users',

    async execute(interactionOrMessage, args = []) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        const isSlash = interactionOrMessage.isCommand?.();

        if (guild.ownerId !== member.id) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Only the **Server Owner** can manage the whitelist.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        let action, user;

        if (isSlash) {
            action = interactionOrMessage.options.getString('action');
            user = interactionOrMessage.options.getUser('user');
        } else {
            action = args[0]?.toLowerCase();
            const userId = args[1]?.replace(/[<@!>]/g, '');
            if (userId) {
                try {
                    user = await interactionOrMessage.client.users.fetch(userId);
                } catch (e) {
                    user = null;
                }
            }
        }

        if (action === 'add') {
            if (!user) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Add to Whitelist')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Select a user to add to the whitelist:')
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new UserSelectMenuBuilder()
                                .setCustomId('antinuke_whitelist_add')
                                .setPlaceholder('Select user to whitelist')
                                .setMinValues(1)
                                .setMaxValues(1)
                        )
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const eventOptions = Object.entries(EVENTS).map(([value, label]) => ({
                label: label,
                value: value,
                description: `Whitelist for ${label}`
            }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### Whitelist ${user.username}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Select which events to whitelist this user for:')
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`antinuke_whitelist_events:${user.id}`)
                            .setPlaceholder('Select events to whitelist')
                            .setMinValues(1)
                            .setMaxValues(Object.keys(EVENTS).length)
                            .addOptions(eventOptions)
                    )
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`antinuke_whitelist_all:${user.id}`)
                            .setLabel('Whitelist All Events')
                            .setStyle(ButtonStyle.Primary)
                    )
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (action === 'remove') {
            if (!user) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Remove from Whitelist')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Select a user to remove from the whitelist:')
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new UserSelectMenuBuilder()
                                .setCustomId('antinuke_whitelist_remove')
                                .setPlaceholder('Select user to remove')
                                .setMinValues(1)
                                .setMaxValues(1)
                        )
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const existing = await AntinukeWhitelist.findOne({
                where: { guildId: guild.id, userId: user.id }
            });

            if (!existing) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${user.username}** is not on the whitelist.`)
                    );
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const userEvents = existing.events;

            if (userEvents && userEvents.length > 0) {
                const eventOptions = userEvents.map(eventKey => ({
                    label: EVENTS[eventKey] || eventKey,
                    value: eventKey,
                    description: `Remove from ${EVENTS[eventKey] || eventKey}`
                }));

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### Remove ${user.username}'s Whitelist`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Select which events to remove, or remove entirely:')
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`antinuke_whitelist_remove_events:${user.id}`)
                                .setPlaceholder('Select events to remove')
                                .setMinValues(1)
                                .setMaxValues(eventOptions.length)
                                .addOptions(eventOptions)
                        )
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`antinuke_whitelist_remove_all:${user.id}`)
                                .setLabel('Remove Entirely')
                                .setStyle(ButtonStyle.Danger)
                        )
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const deleted = await AntinukeWhitelist.destroy({
                where: { guildId: guild.id, userId: user.id }
            });

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**${user.username}** has been removed from the whitelist.`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (action === 'list') {
            return showWhitelistDetailed(interactionOrMessage, guild);
        }

        const whitelist = await AntinukeWhitelist.findAll({ where: { guildId: guild.id } });

        let listContent = '';
        if (whitelist.length === 0) {
            listContent = 'No users are whitelisted.';
        } else {
            listContent = whitelist.map((w, i) => {
                const events = w.events;
                const eventDisplay = events ? `(${events.length} events)` : '(All events)';
                return `\`${i + 1}.\` <@${w.userId}> ${eventDisplay}`;
            }).join('\n');
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### Antinuke Whitelist (${whitelist.length})`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(listContent)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Use `antinuke whitelist list` for detailed view.')
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('antinuke_whitelist_add_btn')
                        .setLabel('Add User')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('antinuke_whitelist_remove_btn')
                        .setLabel('Remove User')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('antinuke_whitelist_list_btn')
                        .setLabel('Detailed List')
                        .setStyle(ButtonStyle.Secondary)
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
};

async function showWhitelistDetailed(interactionOrMessage, guild) {
    const whitelist = await AntinukeWhitelist.findAll({ where: { guildId: guild.id } });

    if (whitelist.length === 0) {
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Antinuke Whitelist')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('No users are whitelisted.')
            );
        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }

    let detailedContent = '';
    for (const w of whitelist) {
        const events = w.events;
        let eventList;
        if (!events || events.length === 0) {
            eventList = '`All Events`';
        } else {
            eventList = events.map(e => `\`${EVENTS[e] || e}\``).join(', ');
        }
        detailedContent += `<@${w.userId}>\n${eventList}\n\n`;
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Antinuke Whitelist - Detailed (${whitelist.length})`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(detailedContent.trim())
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('antinuke_whitelist_add_btn')
                    .setLabel('Add User')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('antinuke_whitelist_remove_btn')
                    .setLabel('Remove User')
                    .setStyle(ButtonStyle.Danger)
            )
        );

    return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
}
