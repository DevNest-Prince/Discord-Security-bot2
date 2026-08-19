


const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const { createPaginationSession } = require('../../utils/pagination');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pinterest')
        .setDescription('Search for images on Pinterest')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Search query for Pinterest images')
                .setRequired(true)
        ),

    name: 'pinterest',
    aliases: ['pin'],
    category: 'social',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isChatInputCommand?.();
        const searchQuery = isSlash
            ? interactionOrMessage.options.getString('query')
            : args.join(' ');
        const userId = isSlash ? interactionOrMessage.user.id : interactionOrMessage.author.id;

        if (!searchQuery) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Pinterest Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Usage: `pinterest <search query>`'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const blacklistedWords = [
            'porn', 'pussy', 'naked', 'vagina', 'dick', 'sex', 'xxx', 'nude', 'nsfw',
            'boobs', 'tits', 'penis', 'cock', 'fuck', 'shit', 'bitch', 'ass', 'anal',
            'orgasm', 'masturbate', 'horny', 'lesbian', 'gay porn', 'milf', 'teen sex',
            'adult', 'erotic', 'fetish', 'hardcore', 'blowjob', 'cumshot', 'threesome'
        ];

        if (blacklistedWords.some(word => searchQuery.toLowerCase().includes(word.toLowerCase()))) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Pinterest Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Search query contains inappropriate content.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        let loadingMsg = null;

        if (isSlash) {
            await interactionOrMessage.deferReply();
        } else {
            const loadingContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Pinterest · ${searchQuery}`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Searching for images...'));
            loadingMsg = await interactionOrMessage.reply({ components: [loadingContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const paginationTarget = isSlash ? interactionOrMessage : loadingMsg;

        try {
            const response = await axios.get('https://apidl.asepharyana.tech/api/search/pinterest', {
                params: { query: searchQuery },
                timeout: 15000
            });

            const pins = response.data;

            if (!pins || !Array.isArray(pins) || pins.length === 0) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Pinterest · ${searchQuery}`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('No pins found. Try different keywords.'));
                if (isSlash) return interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                return loadingMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const totalPages = pins.length;
            const fetchPage = async (pageIndex) => [pins[pageIndex]];

            const renderPage = async (pageIndex, pageResults) => {
                const pin = pageResults[0];

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `### 🖼️ [View on Pinterest](${pin.link})\n-# Pinterest · ${pageIndex + 1}/${totalPages}`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

                if (pin.directLink) {
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(pin.directLink)
                                .setDescription(`Pinterest pin ${pageIndex + 1}`)
                        )
                    );
                }

                return container;
            };

            await createPaginationSession({
                interactionOrMessage: paginationTarget,
                pages: fetchPage,
                renderPage,
                userId,
                totalPages,
                initialPage: 0,
                timeout: 300000,
                useEdit: !isSlash
            }).renderInitial();

        } catch (error) {
            console.error('Pinterest search error:', error);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Pinterest · ${searchQuery}`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Failed to fetch results. Please try again later.'));

            if (isSlash) return interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            return loadingMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
