
/* ===========================================================
    SOLAR CALCULATOR LOGIC
    All formulas are simplified industry-standard estimates for
    lead-generation purposes — not a substitute for a site survey.
=========================================================== */

const ASSUMPTIONS = {
  unitsPerKwPerDay: 4.5,       // avg units generated per kW per day (India avg)
  costPerKw: {
    residential: {
      1: 80000,
      2: 160000,
      3: 220000,
      4: 280000,
      5: 320000,
    },
    commercial: {
      1: 50000,
    }
  },          // ₹ installed cost per kW before subsidy
  panelWattage: 550,         // watts per panel
  subsidy: {
    1 : 30000,
    2 : 60000,
    3 : 78000
  }
};

function calculateSolar({ bill, rate, propType, roofArea }) {
  const monthlyUnits = bill / rate;
  const dailyUnits = monthlyUnits / 30;

  // recommended system size (kW), capped by available roof area (1 kW ≈ 80 sq.ft)
  let recommendedKw = dailyUnits / ASSUMPTIONS.unitsPerKwPerDay;
  const maxKwByRoof = roofArea > 0 ? roofArea / 80 : recommendedKw;
  recommendedKw = Math.min(recommendedKw, maxKwByRoof);
  recommendedKw = Math.max(1, Math.round(recommendedKw * 10) / 10);

  let numbers = recommendedKw.toString().split('.');
  if (numbers.length == 2 && parseInt(numbers[1]) > 2) {
    recommendedKw = parseInt(numbers[0]) + 1;
  } else {
    recommendedKw = parseInt(numbers[0]);
  }

  const panelsRequired = Math.ceil((recommendedKw * 1000) / ASSUMPTIONS.panelWattage);
  let estimatedCost = 0;

  if (propType === 'commercial' || recommendedKw > 5) {
    estimatedCost = recommendedKw * ASSUMPTIONS.costPerKw.commercial[1];
  } else {
    estimatedCost = ASSUMPTIONS.costPerKw.residential[recommendedKw];
  }
  
  // subsidy — residential only (simplified central scheme)
  let subsidy = 0;
  if (propType === 'residential' && recommendedKw <= 5) {
    if (recommendedKw <= 1) {
      subsidy = ASSUMPTIONS.subsidy[1];
    } else if (recommendedKw <= 2) {
      subsidy = ASSUMPTIONS.subsidy[2];
    } else {
      subsidy = ASSUMPTIONS.subsidy[3];
    }
  }

  const costAfterSubsidy = estimatedCost - subsidy;

  const monthlyGeneratedUnits = recommendedKw * ASSUMPTIONS.unitsPerKwPerDay * 30;
  const monthlySavings = Math.round(Math.min(monthlyGeneratedUnits, monthlyUnits) * rate);
  const annualSavings = monthlySavings * 12;
  const lifetimeSavings = annualSavings * 25;

  const paybackYears = monthlySavings > 0 ? (costAfterSubsidy / annualSavings) : 0;
  const roiPercent = costAfterSubsidy > 0 ? Math.round((lifetimeSavings / costAfterSubsidy) * 100) : 0;

  const billReductionPct = Math.min(100, Math.round((monthlySavings / bill) * 100));

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
    billReductionPct
  };
}

function formatINR(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}