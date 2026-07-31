// Chart.js wrapper - weight history line, styled for the dark theme

const ChartUtils = {
  // Keep a handle per canvas so re-rendering a page doesn't stack charts
  instances: {},

  createWeightChart: (canvasId, dates, weights) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;

    if (ChartUtils.instances[canvasId]) {
      ChartUtils.instances[canvasId].destroy();
      delete ChartUtils.instances[canvasId];
    }

    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const pad = Math.max(3, (max - min) * 0.2);

    const grid = 'rgba(255, 255, 255, 0.07)';
    const tick = '#94a3b8';
    const line = '#60a5fa';

    ChartUtils.instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: dates.map(d => DateUtils.parse(d).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric'
        })),
        datasets: [{
          label: 'Weight',
          data: weights,
          borderColor: line,
          backgroundColor: 'rgba(96, 165, 250, 0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: line,
          pointBorderColor: '#0b1017',
          pointBorderWidth: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1b2532',
            borderColor: '#2b3849',
            borderWidth: 1,
            titleColor: '#e8edf5',
            bodyColor: '#e8edf5',
            callbacks: {
              label: (ctx) => `${ctx.parsed.y.toFixed(1)} lbs`
            }
          }
        },
        scales: {
          x: {
            grid: { color: grid, drawBorder: false },
            ticks: { color: tick, maxRotation: 0, autoSkipPadding: 12 }
          },
          y: {
            beginAtZero: false,
            min: min - pad,
            max: max + pad,
            grid: { color: grid, drawBorder: false },
            ticks: { color: tick, callback: (v) => v.toFixed(0) }
          }
        }
      }
    });

    return ChartUtils.instances[canvasId];
  }
};
