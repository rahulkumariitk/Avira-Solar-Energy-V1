/* ===========================================================
   SOLAR CALCULATOR LOGIC
   Edit prices, assumptions and subsidy slabs here.
   All formulas are simplified estimates for lead generation —
   not a substitute for a site survey.
=========================================================== */

const ASSUMPTIONS = {
  unitsPerKwPerDay: 4.5,     // avg units generated per kW per day
  sqftPerKw: 80,             // shadow-free roof area needed per kW
  panelWattage: 550,         // watts per panel
  maxResidentialKw: 5,       // above this we price as commercial
  costPerKw: {
    residential: {           // ₹ total installed price by system size (before subsidy)
      1: 80000,
      2: 160000,
      3: 220000,
      4: 280000,
      5: 320000
    },
    commercial: 50000        // ₹ per kW
  }
};

/* Residential subsidy slabs (maximum per slab).
   Central = PM Surya Ghar, Bihar = state top-up for Bihar homes. */
const SUBSIDY = {
  central: { 1: 30000, 2: 60000, 3: 78000 },   // 3 kW & above: flat ₹78,000
  bihar:   { 1: 10000, 2: 20000, 3: 20000 }    // 2 kW & above: flat ₹20,000
};

function subsidyFor(kw, propType, inBihar = true) {
  if (propType !== 'residential' || kw < 1) return { central: 0, state: 0, total: 0 };
  const slab = Math.min(3, Math.max(1, Math.ceil(kw)));
  const central = SUBSIDY.central[slab];
  const state = inBihar ? SUBSIDY.bihar[slab] : 0;
  return { central, state, total: central + state };
}

function calculateSolar({ bill, rate, propType, roofArea, inBihar = true }) {
  const monthlyUnits = bill / rate;
  const dailyUnits = monthlyUnits / 30;

  // recommended size (kW), capped by roof area
  let kw = dailyUnits / ASSUMPTIONS.unitsPerKwPerDay;
  let roofLimited = false;
  if (roofArea > 0) {
    const maxKwByRoof = roofArea / ASSUMPTIONS.sqftPerKw;
    if (maxKwByRoof < kw) { kw = maxKwByRoof; roofLimited = true; }
  }
  kw = Math.max(1, Math.round(kw * 10) / 10);
  // round to whole kW: up if the decimal part is above .2, otherwise down
  const [whole, dec] = kw.toFixed(1).split('.').map(Number);
  kw = Math.max(1, dec > 2 ? whole + 1 : whole);

  const panelsRequired = Math.ceil((kw * 1000) / ASSUMPTIONS.panelWattage);
  const exceedsResidential = propType === 'residential' && kw > ASSUMPTIONS.maxResidentialKw;

  const estimatedCost = (propType === 'commercial' || exceedsResidential)
    ? kw * ASSUMPTIONS.costPerKw.commercial
    : ASSUMPTIONS.costPerKw.residential[kw];

  const sub = subsidyFor(kw, propType, inBihar);
  const costAfterSubsidy = estimatedCost - sub.total;

  const monthlyGeneratedUnits = kw * ASSUMPTIONS.unitsPerKwPerDay * 30;
  const monthlySavings = Math.round(Math.min(monthlyGeneratedUnits, monthlyUnits) * rate);
  const annualSavings = monthlySavings * 12;
  const lifetimeSavings = annualSavings * 25;
  const paybackYears = annualSavings > 0 ? costAfterSubsidy / annualSavings : 0;
  const billReductionPct = Math.min(100, Math.round((monthlySavings / bill) * 100));

  return {
    monthlyUnits: Math.round(monthlyUnits),
    monthlyGeneratedUnits: Math.round(monthlyGeneratedUnits),
    recommendedKw: kw,
    panelsRequired,
    roofNeeded: Math.round(kw * ASSUMPTIONS.sqftPerKw),
    roofLimited,
    exceedsResidential,
    estimatedCost,
    subsidy: sub.total,
    subsidyCentral: sub.central,
    subsidyState: sub.state,
    costAfterSubsidy,
    monthlySavings,
    billAfter: Math.max(0, bill - monthlySavings),
    annualSavings,
    lifetimeSavings,
    paybackYears: Math.round(paybackYears * 10) / 10,
    billReductionPct
  };
}

function formatINR(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function formatINRShort(n) {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
  return formatINR(n);
}
