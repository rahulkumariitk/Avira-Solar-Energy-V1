
/* ===========================================================
    SOLAR CALCULATOR LOGIC
    All formulas are simplified industry-standard estimates for
    lead-generation purposes — not a substitute for a site survey.
=========================================================== */

const ASSUMPTIONS = {
  unitsPerKwPerDay: 4,       // avg units generated per kW per day (India avg)
  costPerKw: 55000,          // ₹ installed cost per kW before subsidy
  panelWattage: 540,         // watts per panel
  co2PerUnitKg: 0.82,        // kg CO2 offset per unit generated
  subsidy: {
    // simplified central subsidy slabs (residential only, ₹)
    tier1: { maxKw: 2, perKw: 30000 },
    tier2: { maxKw: 3, flat: 60000, extraPerKw: 18000 },
  }
};

function calculateSolar({ bill, rate, propType, roofArea }) {
  rate = rate > 0 ? rate : 8;
  const monthlyUnits = bill / rate;
  const dailyUnits = monthlyUnits / 30;

  // recommended system size (kW), capped by available roof area (1 kW ≈ 100 sq.ft)
  let recommendedKw = dailyUnits / ASSUMPTIONS.unitsPerKwPerDay;
  const maxKwByRoof = roofArea > 0 ? roofArea / 100 : recommendedKw;
  recommendedKw = Math.min(recommendedKw, maxKwByRoof);
  recommendedKw = Math.max(1, Math.round(recommendedKw * 10) / 10);

  const panelsRequired = Math.ceil((recommendedKw * 1000) / ASSUMPTIONS.panelWattage);
  const estimatedCost = Math.round(recommendedKw * ASSUMPTIONS.costPerKw);

  // subsidy — residential only (simplified central scheme)
  let subsidy = 0;
  if (propType === 'residential') {
    if (recommendedKw <= 2) {
      subsidy = recommendedKw * ASSUMPTIONS.subsidy.tier1.perKw;
    } else if (recommendedKw <= 3) {
      subsidy = ASSUMPTIONS.subsidy.tier2.flat;
    } else {
      subsidy = ASSUMPTIONS.subsidy.tier2.flat +
        (Math.min(recommendedKw, 10) - 3) * ASSUMPTIONS.subsidy.tier2.extraPerKw;
    }
  }
  subsidy = Math.round(Math.min(subsidy, estimatedCost * 0.4));
  const costAfterSubsidy = estimatedCost - subsidy;

  const monthlyGeneratedUnits = recommendedKw * ASSUMPTIONS.unitsPerKwPerDay * 30;
  const monthlySavings = Math.round(Math.min(monthlyGeneratedUnits, monthlyUnits) * rate);
  const annualSavings = monthlySavings * 12;
  const lifetimeSavings = annualSavings * 25;

  const paybackYears = monthlySavings > 0 ? (costAfterSubsidy / annualSavings) : 0;
  const roiPercent = costAfterSubsidy > 0 ? Math.round((lifetimeSavings / costAfterSubsidy) * 100) : 0;

  const billReductionPct = Math.min(100, Math.round((monthlySavings / bill) * 100));
  const annualCo2ReductionKg = Math.round(monthlyGeneratedUnits * 12 * ASSUMPTIONS.co2PerUnitKg);

  return {
    monthlyUnits: Math.round(monthlyUnits),
    recommendedKw,
    panelsRequired,
    estimatedCost,
    subsidy,
    costAfterSubsidy,
    monthlySavings,
    annualSavings,
    lifetimeSavings,
    paybackYears: Math.round(paybackYears * 10) / 10,
    roiPercent,
    billReductionPct,
    annualCo2ReductionKg
  };
}

function formatINR(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}