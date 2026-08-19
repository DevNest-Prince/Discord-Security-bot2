const DEFAULT_COLOR = 0x5865F2;

function hexToDecimal(hex) {
    if (typeof hex !== 'string') return DEFAULT_COLOR;
    const cleaned = hex.trim().replace(/^#/, '');
    if (!/^[0-9a-fA-F]{3,8}$/.test(cleaned)) return DEFAULT_COLOR;
    const value = parseInt(cleaned, 16);
    return Number.isNaN(value) ? DEFAULT_COLOR : value;
}

function discordColorToDecimal(colorName) {
    const colors = {
        'Red': 0xED4245,
        'Green': 0x57F287,
        'Blue': 0x5865F2,
        'Yellow': 0xFEE75C,
        'Purple': 0x9B59B6,
        'White': 0xFFFFFF
    };
    return colors[colorName] ?? DEFAULT_COLOR;
}

module.exports = { hexToDecimal, discordColorToDecimal };
