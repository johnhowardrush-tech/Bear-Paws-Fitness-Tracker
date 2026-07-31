// Date helpers. Dates are handled as plain YYYY-MM-DD strings so they compare
// lexicographically and never shift across timezones.

const DateUtils = {
  format: (date) => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  },

  // Parse as local midnight, not UTC
  parse: (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  },

  today: () => DateUtils.format(new Date()),

  addDays: (dateString, days) => {
    const d = DateUtils.parse(dateString);
    d.setDate(d.getDate() + days);
    return DateUtils.format(d);
  },

  subtractDays: (dateString, days) => DateUtils.addDays(dateString, -days),

  compare: (dateA, dateB) => {
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return 0;
  },

  display: (dateString) => {
    if (!dateString) return '--';
    return DateUtils.parse(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  },

  displayRelative: (dateString) => {
    if (!dateString) return '--';
    const today = DateUtils.today();
    if (dateString === today) return 'Today';
    if (dateString === DateUtils.subtractDays(today, 1)) return 'Yesterday';
    return DateUtils.display(dateString);
  },

  getDayName: (dateString) => {
    return DateUtils.parse(dateString).toLocaleDateString('en-US', { weekday: 'short' });
  },

  // Upcoming Sunday - the default bet deadline
  nextSunday: () => {
    const d = new Date();
    do {
      d.setDate(d.getDate() + 1);
    } while (d.getDay() !== 0);
    return DateUtils.format(d);
  }
};
