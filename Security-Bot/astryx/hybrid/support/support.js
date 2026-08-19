


const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Get the support server invite link'),

    name: 'support',
    aliases: [],
    description: 'Get the support server invite link',

    async execute(interactionOrMessage) {
        const config = require('../../config');
        const { isHttpUrl } = require('../../utils/url');
        if (!isHttpUrl(config.SUPPORT_SERVER)) {
            return interactionOrMessage.reply('Support server is not configured yet.');
        }
        return interactionOrMessage.reply(config.SUPPORT_SERVER);
    }
};
