


const config = require('../config');
const emojis = require('../emojis.json');

async function checkAdminPermissions(interaction) {
    const userId = interaction.user.id;
    const member = interaction.member;

    if (config.ADMIN_USER_IDS.includes(userId)) {
        if (config.DEBUG) {
            console.log(`${emojis.general.check_mark} User ${interaction.user.tag} (${userId}) authorized via ADMIN_USER_IDS`);
        }
        return true;
    }

    if (config.ADMIN_ROLE_ID && member) {
        if (member.roles.cache.has(config.ADMIN_ROLE_ID)) {
            if (config.DEBUG) {
                console.log(`${emojis.general.check_mark} User ${interaction.user.tag} (${userId}) authorized via ADMIN_ROLE_ID`);
            }
            return true;
        }
    }

    if (member && member.permissions.has('Administrator')) {
        if (config.DEBUG) {
            console.log(`${emojis.general.check_mark} User ${interaction.user.tag} (${userId}) authorized via Administrator permission`);
        }
        return true;
    }

    if (member && member.permissions.has('ManageGuild')) {
        if (config.DEBUG) {
            console.log(`${emojis.general.check_mark} User ${interaction.user.tag} (${userId}) authorized via ManageGuild permission`);
        }
        return true;
    }

    if (config.DEBUG) {
        console.log(`${emojis.general.cross_mark} User ${interaction.user.tag} (${userId}) denied access - insufficient permissions`);
    }

    return false;
}

function isServerOwner(interaction) {
    return interaction.guild && interaction.guild.ownerId === interaction.user.id;
}

function logPermissionCheck(interaction, granted, reason) {
}

async function checkAdminPermissionsWithLogging(interaction) {
    const userId = interaction.user.id;
    const member = interaction.member;

    if (config.ADMIN_USER_IDS.includes(userId)) {
        logPermissionCheck(interaction, true, 'User in ADMIN_USER_IDS');
        return true;
    }

    if (config.ADMIN_ROLE_ID && member && member.roles.cache.has(config.ADMIN_ROLE_ID)) {
        logPermissionCheck(interaction, true, 'User has ADMIN_ROLE_ID');
        return true;
    }

    if (member && member.permissions.has('Administrator')) {
        logPermissionCheck(interaction, true, 'User has Administrator permission');
        return true;
    }

    if (member && member.permissions.has('ManageGuild')) {
        logPermissionCheck(interaction, true, 'User has ManageGuild permission');
        return true;
    }

    if (isServerOwner(interaction)) {
        logPermissionCheck(interaction, true, 'User is server owner');
        return true;
    }

    logPermissionCheck(interaction, false, 'No valid permissions found');
    return false;
}

function getUserPermissionLevel(interaction) {
    if (isServerOwner(interaction)) {
        return 'owner';
    }

    if (checkAdminPermissions(interaction)) {
        return 'admin';
    }

    return 'user';
}

module.exports = {
    checkAdminPermissions,
    checkAdminPermissionsWithLogging,
    isServerOwner,
    logPermissionCheck,
    getUserPermissionLevel
};
