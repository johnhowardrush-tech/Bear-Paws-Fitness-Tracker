// App init + tab routing

const UI = {
  currentPage: 'dashboard',
  ready: false,

  renderers: {
    dashboard: () => renderDashboard(),
    checkin: () => renderCheckin(),
    profiles: () => renderProfiles(),
    leaderboard: () => renderLeaderboard(),
    bets: () => renderBets()
  },

  init: async () => {
    UI.setBusy(true);
    UI.setupNavigation();

    await AppState.init();
    UI.ready = true;
    UI.render(true);

    await FirebaseInit.init();
    UI.setBusy(false);
    UI.render(true);
  },

  setupNavigation: () => {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => UI.showPage(tab.dataset.page));
    });
  },

  setBusy: (busy) => {
    const el = document.getElementById('loading-indicator');
    if (el) el.classList.toggle('active', busy);
  },

  showPage: (page) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const pageEl = document.getElementById(`${page}-page`);
    if (pageEl) pageEl.classList.add('active');

    const tab = document.querySelector(`[data-page="${page}"]`);
    if (tab) tab.classList.add('active');

    UI.currentPage = page;
    UI.render(true);
  },

  // A live Firestore snapshot must not blow away a form someone is filling in,
  // so data-driven renders skip pages with in-progress input. Navigation and
  // explicit saves pass force = true.
  isEditing: () => {
    if (UI.currentPage === 'checkin') {
      return !!document.getElementById('checkin-form');
    }
    if (UI.currentPage === 'profiles') {
      return editingProfile !== null;
    }
    return false;
  },

  render: (force = false) => {
    if (!UI.ready) return;
    if (!force && UI.isEditing()) return;

    const renderer = UI.renderers[UI.currentPage];
    if (!renderer) return;

    try {
      renderer();
    } catch (error) {
      console.error(`Failed to render ${UI.currentPage}:`, error);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => UI.init());
