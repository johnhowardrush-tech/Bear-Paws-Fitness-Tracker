// Date utilities

const DateUtils = {
  // Format date as YYYY-MM-DD
  format: (date) => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  },

  // Parse YYYY-MM-DD to Date
  parse: (dateString) => {
    const [year, month, day] = dateString.split('-');
    return new Date(year, month - 1, day);
  },

  // Get today as YYYY-MM-DD
  today: () => {
    return DateUtils.format(new Date());
  },

  // Get date N days from now
  addDays: (dateString, days) => {
    const d = new Date(dateString);
    d.setDate(d.getDate() + days);
    return DateUtils.format(d);
  },

  // Get date N days ago
  subtractDays: (dateString, days) => {
    return DateUtils.addDays(dateString, -days);
  },

  // Compare two date strings. Returns -1 if a < b, 0 if equal, 1 if a > b
  compare: (dateA, dateB) => {
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return 0;
  },

  // Human-friendly date display
  display: (dateString) => {
    const d = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  },

  // Display relative to today (e.g., "Today", "Yesterday", "Mar 15")
  displayRelative: (dateString) => {
    const today = DateUtils.today();
    const yesterday = DateUtils.subtractDays(today, 1);

    if (dateString === today) return 'Today';
    if (dateString === yesterday) return 'Yesterday';
    return DateUtils.display(dateString);
  },

  // Get day of week (0 = Sunday, 6 = Saturday)
  getDayOfWeek: (dateString) => {
    const d = new Date(dateString);
    return d.getDay();
  },

  // Get short day name (Mon, Tue, etc)
  getDayName: (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }
};
