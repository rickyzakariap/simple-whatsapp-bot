const axios = require('axios');

module.exports = {
  name: 'weather',
  description: 'Get weather information for a city',
  usage: '.weather <city name>',
  async execute(sock, msg, args) {
    try {
      const city = args.join(' ');
      
      if (!city) {
        return sock.sendMessage(msg.key.remoteJid, { 
          text: 'Usage: .weather <city name>\nExample: .weather Jakarta\nExample: .weather New York' 
        }, { quoted: msg });
      }

      // Send initial message
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `🌤️ Getting weather info for ${city}...` 
      }, { quoted: msg });

      // Get weather data using OpenWeatherMap API (free tier)
      const apiKey = 'YOUR_API_KEY'; // You'll need to get a free API key from openweathermap.org
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          q: city,
          appid: apiKey,
          units: 'metric', // Celsius
          lang: 'en'
        },
        timeout: 10000
      });

      if (!response.data) {
        return sock.sendMessage(msg.key.remoteJid, { 
          text: `❌ Weather data not available for ${city}` 
        }, { quoted: msg });
      }

      const weather = response.data;
      const temp = Math.round(weather.main.temp);
      const feelsLike = Math.round(weather.main.feels_like);
      const humidity = weather.main.humidity;
      const windSpeed = Math.round(weather.wind.speed * 3.6); // Convert m/s to km/h
      const description = weather.weather[0].description;
      const icon = weather.weather[0].icon;
      
      // Weather emoji mapping
      const weatherEmojis = {
        '01d': '☀️', '01n': '🌙',
        '02d': '⛅', '02n': '☁️',
        '03d': '☁️', '03n': '☁️',
        '04d': '☁️', '04n': '☁️',
        '09d': '🌧️', '09n': '🌧️',
        '10d': '🌦️', '10n': '🌧️',
        '11d': '⛈️', '11n': '⛈️',
        '13d': '🌨️', '13n': '🌨️',
        '50d': '🌫️', '50n': '🌫️'
      };

      const emoji = weatherEmojis[icon] || '🌤️';
      
      let resultText = `${emoji} *Weather in ${weather.name}, ${weather.sys.country}*\n\n`;
      resultText += `*Temperature:* ${temp}°C\n`;
      resultText += `*Feels like:* ${feelsLike}°C\n`;
      resultText += `*Condition:* ${description.charAt(0).toUpperCase() + description.slice(1)}\n`;
      resultText += `*Humidity:* ${humidity}%\n`;
      resultText += `*Wind Speed:* ${windSpeed} km/h\n`;
      resultText += `*Pressure:* ${weather.main.pressure} hPa\n\n`;
      
      if (weather.visibility) {
        resultText += `*Visibility:* ${Math.round(weather.visibility / 1000)} km\n`;
      }
      
      if (weather.sys.sunrise && weather.sys.sunset) {
        const sunrise = new Date(weather.sys.sunrise * 1000).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        const sunset = new Date(weather.sys.sunset * 1000).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        resultText += `*Sunrise:* ${sunrise}\n`;
        resultText += `*Sunset:* ${sunset}\n`;
      }
      
      resultText += `\n🕐 *Last updated:* ${new Date().toLocaleString()}`;

      await sock.sendMessage(msg.key.remoteJid, { text: resultText }, { quoted: msg });

    } catch (error) {
      console.error('Weather error:', error);
      
      let errorMessage = '❌ Failed to get weather information.';
      
      if (error.response?.status === 404) {
        errorMessage = '❌ City not found. Please check the spelling.';
      } else if (error.response?.status === 401) {
        errorMessage = '❌ Weather service configuration error.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '❌ Request timeout. Please try again.';
      } else if (error.response?.status >= 500) {
        errorMessage = '❌ Weather service temporarily unavailable.';
      }
      
      await sock.sendMessage(msg.key.remoteJid, { text: errorMessage }, { quoted: msg });
    }
  },
}; 