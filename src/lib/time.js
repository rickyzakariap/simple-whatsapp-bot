const config = require('../../config');

const DEFAULT_TIMEZONE = 'UTC';

function safeTimezone(timezone = config.timezone) {
  const candidate = timezone || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function getDateParts(date = new Date(), timezone = config.timezone) {
  const zone = safeTimezone(timezone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    date: `${values.year}-${values.month}-${values.day}`,
    mmdd: `${values.month}-${values.day}`,
    hhmm: `${values.hour}:${values.minute}`,
    timezone: zone
  };
}

module.exports = {
  safeTimezone,
  getDateParts
};
