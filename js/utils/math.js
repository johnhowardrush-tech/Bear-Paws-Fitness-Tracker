// Fitness metrics - fair comparison math and blood pressure scoring
//
// SIGN CONVENTION (important): every "change" value is (current - start).
//   negative = moved the healthy direction (lost weight, BMI down, BP down) -> green
//   positive = moved the wrong way (gained weight, BMI up, BP up)           -> red
// So gaining a pound reads "+1.0 lbs" in red, losing five reads "-5.0 lbs" in green.

const FitnessMetrics = {
  // BMI from weight (lbs) and height (inches)
  bmi: (weight_lbs, height_inches) => {
    if (!height_inches) return 0;
    return (weight_lbs / (height_inches * height_inches)) * 703;
  },

  // Signed pounds moved since start
  weightChange: (start_weight, current_weight) => {
    return current_weight - start_weight;
  },

  // Signed percent of body weight moved since start - PRIMARY ranking metric.
  // Most negative wins. Normalizes for starting size: 10 lbs off 180 (-5.56%)
  // beats 10 lbs off 220 (-4.55%).
  percentChange: (start_weight, current_weight) => {
    if (!start_weight) return 0;
    return ((current_weight - start_weight) / start_weight) * 100;
  },

  // Signed BMI points moved since start
  bmiChange: (start_weight, height_inches, current_weight) => {
    return FitnessMetrics.bmi(current_weight, height_inches)
         - FitnessMetrics.bmi(start_weight, height_inches);
  },

  // ---- Blood pressure ----

  // Mean Arterial Pressure: folds systolic and diastolic into one comparable
  // number. This is the value we track for improvement and bet on.
  // Healthy range is roughly 70-100.
  map: (systolic, diastolic) => {
    if (!systolic || !diastolic) return null;
    return diastolic + (systolic - diastolic) / 3;
  },

  // AHA categories, checked most severe first
  bpCategory: (systolic, diastolic) => {
    if (!systolic || !diastolic) return { label: 'No reading', level: -1, tone: 'muted' };
    if (systolic > 180 || diastolic > 120) return { label: 'Crisis', level: 4, tone: 'danger' };
    if (systolic >= 140 || diastolic >= 90) return { label: 'Stage 2', level: 3, tone: 'danger' };
    if (systolic >= 130 || diastolic >= 80) return { label: 'Stage 1', level: 2, tone: 'warning' };
    if (systolic >= 120) return { label: 'Elevated', level: 1, tone: 'warning' };
    return { label: 'Normal', level: 0, tone: 'success' };
  },

  // Signed MAP points moved since baseline. Negative = BP improving.
  mapChange: (start_bp, current_bp) => {
    const startMap = start_bp ? FitnessMetrics.map(start_bp.systolic, start_bp.diastolic) : null;
    const currentMap = current_bp ? FitnessMetrics.map(current_bp.systolic, current_bp.diastolic) : null;
    if (startMap === null || currentMap === null) return null;
    return currentMap - startMap;
  },

  // Everything a view needs for one participant.
  // current_bp / start_bp are {systolic, diastolic} or null.
  getMetrics: (participant, current_weight, current_bp = null, start_bp = null) => {
    const start_weight = participant.start_weight_lbs;
    const height = participant.height_inches;

    const start_bmi = FitnessMetrics.bmi(start_weight, height);
    const current_bmi = FitnessMetrics.bmi(current_weight, height);

    const current_map = current_bp
      ? FitnessMetrics.map(current_bp.systolic, current_bp.diastolic)
      : null;

    return {
      start_weight,
      current_weight,
      weight_change: FitnessMetrics.weightChange(start_weight, current_weight),
      percent_change: FitnessMetrics.percentChange(start_weight, current_weight),
      start_bmi,
      current_bmi,
      bmi_change: current_bmi - start_bmi,

      systolic: current_bp ? current_bp.systolic : null,
      diastolic: current_bp ? current_bp.diastolic : null,
      bp_date: current_bp ? current_bp.date : null,
      map: current_map,
      map_change: FitnessMetrics.mapChange(start_bp, current_bp),
      bp_category: FitnessMetrics.bpCategory(
        current_bp ? current_bp.systolic : null,
        current_bp ? current_bp.diastolic : null
      )
    };
  },

  // ---- Display helpers ----

  // "+1.0 lbs" / "-5.5 lbs" / "0.0 lbs"
  formatSigned: (value, unit = '', decimals = 1) => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    const n = Number(value);
    const sign = n > 0 ? '+' : n < 0 ? '-' : '';
    const body = Math.abs(n).toFixed(decimals);
    return sign + body + (unit ? ' ' + unit : '');
  },

  formatSignedPercent: (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    const n = Number(value);
    const sign = n > 0 ? '+' : n < 0 ? '-' : '';
    return sign + Math.abs(n).toFixed(decimals) + '%';
  },

  formatBp: (systolic, diastolic) => {
    if (!systolic || !diastolic) return '--';
    return `${systolic}/${diastolic}`;
  },

  // CSS class for a signed change: gaining is bad (red), losing is good (green)
  toneFor: (change) => {
    if (change === null || change === undefined || isNaN(change)) return 'muted';
    if (change > 0) return 'danger';
    if (change < 0) return 'success';
    return 'muted';
  }
};
