


const axios = require("axios");
const config = require("../config");

async function getRandomTenorGif(searchTerm) {
  try {
    const apiKey = config.TENOR.API_KEY;
    if (!apiKey) return null;

    const response = await axios.get("https://tenor.googleapis.com/v2/search", {
      params: {
        q: searchTerm,
        key: apiKey,
        client_key: config.TENOR.CLIENT_KEY,
        limit: 25,
        media_filter: "gif",
        contentfilter: "medium"
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      const randomIndex = Math.floor(Math.random() * response.data.results.length);
      return response.data.results[randomIndex].media_formats.gif.url;
    }
  } catch (error) {
    console.error("Error fetching GIF:", error);
  }
  return null;
}

module.exports = { getRandomTenorGif };
