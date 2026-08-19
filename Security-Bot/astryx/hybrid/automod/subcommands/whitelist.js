


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
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const { AutomodWhitelist } = require('../../../../database/models');

const MODULES = AutomodWhitelist.MODULES;

module.exports = {
    name: 'whitelist',
    description: 'Manage whitelisted users, roles, and channels',

    async execute(interactionOrMessage, args = []) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        const isSlash = interactionOrMessage.isCommand?.();

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('You need **Manage Server** permission to manage the whitelist.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        let action;

        if (isSlash) {
            action = interactionOrMessage.options.getString('action');
        } else {
            action = args[0]?.toLowerCase();
        }

        if (action === 'add') {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Add to Whitelist')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Select what type to whitelist:')
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('automod_whitelist_type_user')
                            .setLabel('User')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('automod_whitelist_type_role')
                            .setLabel('Role')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('automod_whitelist_type_channel')
                            .setLabel('Channel')
                            .setStyle(ButtonStyle.Primary)
                    )
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (action === 'remove') {
            const whitelist = await AutomodWhitelist.findAll({ where: { guildId: guild.id } });

            if (whitelist.length === 0) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('The whitelist is empty.')
                    );
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const options = whitelist.slice(0, 25).map(w => {
                const typeLabel = w.targetType === 'user' ? 'User' : w.targetType === 'role' ? 'Role' : 'Channel';
                return {
                    label: `${typeLabel}: ${w.targetId}`,
                    value: w.targetId,
                    description: `Remove ${typeLabel.toLowerCase()} from whitelist`
                };
            });

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Remove from Whitelist')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Select an entry to remove:')
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('automod_whitelist_remove')
                            .setPlaceholder('Select entry to remove')
                            .addOptions(options)
                    )
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (action === 'list') {
            return showWhitelistDetailed(interactionOrMessage, guild);
        }


        const whitelist = await AutomodWhitelist.findAll({ where: { guildId: guild.id } });

        const users = whitelist.filter(w => w.targetType === 'user');
        const roles = whitelist.filter(w => w.targetType === 'role');
        const channels = whitelist.filter(w => w.targetType === 'channel');

        let listContent = '';
        if (whitelist.length === 0) {
            listContent = 'No entries in the whitelist.';
        } else {
            if (users.length > 0) {
                listContent += `**Users (${users.length}):**\n${users.map(u => `<@${u.targetId}>`).join(', ')}\n\n`;
            }
            if (roles.length > 0) {
                listContent += `**Roles (${roles.length}):**\n${roles.map(r => `<@&${r.targetId}>`).join(', ')}\n\n`;
            }
            if (channels.length > 0) {
                listContent += `**Channels (${channels.length}):**\n${channels.map(c => `<#${c.targetId}>`).join(', ')}`;
            }
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### AutoMod Whitelist (${whitelist.length})`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(listContent.trim() || 'No entries.')
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('automod_whitelist_add_btn')
                        .setLabel('Add')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('automod_whitelist_remove_btn')
                        .setLabel('Remove')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('automod_whitelist_list_btn')
                        .setLabel('Detailed')
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
    const whitelist = await AutomodWhitelist.findAll({ where: { guildId: guild.id } });

    if (whitelist.length === 0) {
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### AutoMod Whitelist')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('No entries in the whitelist.')
            );
        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }

    let detailedContent = '';
    for (const w of whitelist) {
        const modules = w.getModules();
        let moduleList;
        if (!modules || modules.length === 0) {
            moduleList = '`All Modules`';
        } else {
            moduleList = modules.map(m => `\`${MODULES[m] || m}\``).join(', ');
        }

        let mention;
        if (w.targetType === 'user') mention = `<@${w.targetId}>`;
        else if (w.targetType === 'role') mention = `<@&${w.targetId}>`;
        else mention = `<#${w.targetId}>`;

        detailedContent += `${mention}\n${moduleList}\n\n`;
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### AutoMod Whitelist - Detailed (${whitelist.length})`)
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
                    .setCustomId('automod_whitelist_add_btn')
                    .setLabel('Add')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('automod_whitelist_remove_btn')
                    .setLabel('Remove')
                    .setStyle(ButtonStyle.Danger)
            )
        );

    return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
}
