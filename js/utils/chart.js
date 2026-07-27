// Chart.js wrapper for weight history charts

const ChartUtils = {
  // Create a line chart for weight history
  createWeightChart: (canvasId, dates, weights, participantName) => {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // Find min and max for better Y-axis scaling
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const padding = Math.max(10, (maxWeight - minWeight) * 0.1);

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates.map(d => DateUtils.display(d)),
        datasets: [{
          label: 'Weight',
          data: weights,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.05)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return context.parsed.y.toFixed(1) + ' lbs';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: minWeight - padding,
            max: maxWeight + padding,
            ticks: {
              callback: (value) => {
                return value.toFixed(0);
              }
            }
          }
        }
      }
    });
  }
};
