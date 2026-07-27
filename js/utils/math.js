// Fair comparison and fitness metrics

const FitnessMetrics = {
  // Calculate BMI from weight (lbs) and height (inches)
  bmi: (weight_lbs, height_inches) => {
    return (weight_lbs / (height_inches * height_inches)) * 703;
  },

  // Calculate absolute pounds lost
  lbsLost: (start_weight, current_weight) => {
    return start_weight - current_weight;
  },

  // Calculate percentage of body weight lost (PRIMARY metric for ranking)
  percentLost: (start_weight, current_weight) => {
    const lost = FitnessMetrics.lbsLost(start_weight, current_weight);
    return (lost / start_weight) * 100;
  },

  // Calculate BMI change
  bmiChange: (start_weight, start_height_inches, current_weight) => {
    const startBmi = FitnessMetrics.bmi(start_weight, start_height_inches);
    const currentBmi = FitnessMetrics.bmi(current_weight, start_height_inches);
    return startBmi - currentBmi;
  },

  // Get all metrics as an object
  getMetrics: (participant, current_weight) => {
    const lbs_lost = FitnessMetrics.lbsLost(participant.start_weight_lbs, current_weight);
    const percent_lost = FitnessMetrics.percentLost(participant.start_weight_lbs, current_weight);
    const start_bmi = FitnessMetrics.bmi(participant.start_weight_lbs, participant.height_inches);
    const current_bmi = FitnessMetrics.bmi(current_weight, participant.height_inches);
    const bmi_change = start_bmi - current_bmi;

    return {
      lbs_lost: lbs_lost.toFixed(1),
      percent_lost: percent_lost.toFixed(2),
      start_bmi: start_bmi.toFixed(1),
      current_bmi: current_bmi.toFixed(1),
      bmi_change: bmi_change.toFixed(2)
    };
  },

  // Format percent for display
  formatPercent: (value) => {
    return parseFloat(value).toFixed(2) + '%';
  },

  // Format pounds for display
  formatPounds: (value) => {
    const num = parseFloat(value);
    return (num >= 0 ? '+' : '') + num.toFixed(1) + ' lbs';
  },

  // Format BMI for display
  formatBmi: (value) => {
    return parseFloat(value).toFixed(1);
  }
};
