const axios = require('axios');

function describeWeather(code, isDay = 1) {
  if (code === 0) return { text: 'Clear sky', emoji: isDay ? '☀️' : '🌙' };
  if ([1, 2].includes(code)) return { text: 'Partly cloudy', emoji: isDay ? '⛅' : '☁️' };
  if (code === 3) return { text: 'Overcast', emoji: '☁️' };
  if ([45, 48].includes(code)) return { text: 'Fog', emoji: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: 'Drizzle', emoji: '🌦️' };
  if ([61, 63, 65, 66, 67].includes(code)) return { text: 'Rain', emoji: '🌧️' };
  if ([71, 73, 75, 77].includes(code)) return { text: 'Snow', emoji: '🌨️' };
  if ([80, 81, 82].includes(code)) return { text: 'Rain showers', emoji: '🌦️' };
  if ([85, 86].includes(code)) return { text: 'Snow showers', emoji: '🌨️' };
  if ([95, 96, 99].includes(code)) return { text: 'Thunderstorm', emoji: '⛈️' };
  return { text: 'Unknown', emoji: '🌤️' };
}

module.exports = {
  name: 'weather',
  description: 'Get weather information for a city (Open-Meteo, no API key)',
  usage: '.weather <city name>',
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const city = args.join(' ').trim();
    if (!city) {
      return sock.sendMessage(chatId, {
        text: 'Usage: .weather <city name>\nExample: .weather Jakarta'
      }, { quoted: msg });
    }

    try {
      const geo = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: { name: city, count: 1, language: 'en', format: 'json' },
        timeout: 10000
      });

      const location = geo.data?.results?.[0];
      if (!location) {
        return sock.sendMessage(chatId, { text: `❌ City not found: ${city}` }, { quoted: msg });
      }

      const forecast = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure',
          daily: 'sunrise,sunset',
          timezone: 'auto',
          forecast_days: 1
        },
        timeout: 10000
      });

      const current = forecast.data?.current;
      const units = forecast.data?.current_units || {};
      if (!current) {
        return sock.sendMessage(chatId, { text: '❌ Weather data is not available right now.' }, { quoted: msg });
      }

      const condition = describeWeather(current.weather_code, current.is_day);
      const place = [location.name, location.admin1, location.country].filter(Boolean).join(', ');
      const sunrise = forecast.data?.daily?.sunrise?.[0];
      const sunset = forecast.data?.daily?.sunset?.[0];

      let text = `${condition.emoji} *Weather in ${place}*\n\n`;
      text += `*Temperature:* ${current.temperature_2m}${units.temperature_2m || '°C'}\n`;
      text += `*Feels like:* ${current.apparent_temperature}${units.apparent_temperature || '°C'}\n`;
      text += `*Condition:* ${condition.text}\n`;
      text += `*Humidity:* ${current.relative_humidity_2m}${units.relative_humidity_2m || '%'}\n`;
      text += `*Wind:* ${current.wind_speed_10m} ${units.wind_speed_10m || 'km/h'}\n`;
      text += `*Pressure:* ${current.surface_pressure} ${units.surface_pressure || 'hPa'}\n`;
      text += `*Precipitation:* ${current.precipitation} ${units.precipitation || 'mm'}\n`;
      if (sunrise) text += `*Sunrise:* ${sunrise.split('T')[1] || sunrise}\n`;
      if (sunset) text += `*Sunset:* ${sunset.split('T')[1] || sunset}\n`;
      text += `\n_Source: Open-Meteo_`;

      await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (error) {
      console.error('Weather error:', error.message);
      const message = error.code === 'ECONNABORTED'
        ? '❌ Request timeout. Please try again.'
        : '❌ Failed to get weather information.';
      await sock.sendMessage(chatId, { text: message }, { quoted: msg });
    }
  }
};
