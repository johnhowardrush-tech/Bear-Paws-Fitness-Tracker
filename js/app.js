// Main app initialization and routing

const UI = {
  currentPage: 'dashboard',

  init: async () => {
    console.log('Initializing app...');

    // Initialize state with seed data
    await AppState.init();

    // Initialize Firebase
    await FirebaseInit.init();

    // Set up event listeners
    UI.setupNavigation();
    UI.setupPageTransitions();

    console.log('App initialized');
  },

  setupNavigation: () => {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const page = tab.dataset.page;
        UI.showPage(page);
      });
    });
  },

  setupPageTransitions: () => {
    // Each page module is responsible for rendering its own content
    // when UI.render() is called
  },

  showPage: (page) => {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    // Show selected page
    const pageEl = document.getElementById(`${page}-page`);
    if (pageEl) {
      pageEl.classList.add('active');
    }

    // Highlight nav tab
    const tab = document.querySelector(`[data-page="${page}"]`);
    if (tab) {
      tab.classList.add('active');
    }

    UI.currentPage = page;
    UI.render();
  },

  render: () => {
    // Show loading indicator
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) {
      loadingEl.classList.add('active');
    }

    // Render current page
    setTimeout(() => {
      if (UI.currentPage === 'dashboard' && typeof renderDashboard === 'function') {
        renderDashboard();
      } else if (UI.currentPage === 'checkin' && typeof renderCheckin === 'function') {
        renderCheckin();
      } else if (UI.currentPage === 'profiles' && typeof renderProfiles === 'function') {
        renderProfiles();
      } else if (UI.currentPage === 'leaderboard' && typeof renderLeaderboard === 'function') {
        renderLeaderboard();
      } else if (UI.currentPage === 'bets' && typeof renderBets === 'function') {
        renderBets();
      }

      // Hide loading indicator
      if (loadingEl) {
        loadingEl.classList.remove('active');
      }
    }, 100);
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
