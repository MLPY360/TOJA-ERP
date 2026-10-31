import { getAvailableStock, getProductSizes } from './stockUtils.js';

/**
 * Normalizes a number safely, returning fallback if invalid.
 */
const safeNum = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * 1. Product Contribution Matrix & Profit Classification
 * Computes dynamic net performance metrics for each SKU/Model:
 * - Gross Profit Margin %
 * - Delivery Success Rate %
 * - Return Losses Incurred (EGP wasted on courier fees for returned orders)
 * - Realized Net Cash Generated
 * - Sales Velocity (last 14 days)
 * - Algorithmic Badges: Scale Up (🌟), Margin Leak (⚠️), Dead Capital (💤), Balanced (⚖️)
 * - Actionable Recommendations
 */
export const calculateProductContributionMatrix = (products = [], orders = []) => {
  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

  // Pre-process orders to avoid repetitive iterations
  const activeOrders = orders.filter(o => !o.isDeleted);

  const matrix = products.map(product => {
    const sp = safeNum(product.sellingPrice, 0);
    const cp = safeNum(product.costPrice, 0);
    const grossMarginPerUnit = Math.max(0, sp - cp);
    const grossMarginPct = sp > 0 ? Number((((sp - cp) / sp) * 100).toFixed(1)) : 0;

    let totalOrderedUnits = 0;
    let deliveredUnits = 0;
    let deliveredRevenue = 0;
    let deliveredOrdersCount = 0;
    let returnedUnits = 0;
    let returnedOrdersCount = 0;
    let returnLossesIncurred = 0;
    let unitsSoldLast14Days = 0;
    let totalOrdersWithProduct = 0;

    activeOrders.forEach(order => {
      const items = order.items || [];
      const matchItem = items.find(it => String(it.productId) === String(product.id));

      if (!matchItem) return;

      totalOrdersWithProduct += 1;
      const qty = safeNum(matchItem.qty || matchItem.quantity, 1);
      const unitPrice = safeNum(matchItem.unitPrice ?? product.sellingPrice, 0);
      totalOrderedUnits += qty;

      // Check order creation date for 14-day velocity
      const orderDateMs = order.createdAt?.toDate ? order.createdAt.toDate().getTime() : new Date(order.createdAt || 0).getTime();
      const isRecent14d = orderDateMs >= fourteenDaysAgo;

      const isDelivered = order.status === 'Delivered - Collected' || order.status === 'Delivered' || order.status === 'Delivered - Pending Cash';
      const isReturned = order.status === 'Returned';
      const isCancelled = order.status === 'Cancelled';

      if (!isCancelled && !isReturned && isRecent14d) {
        unitsSoldLast14Days += qty;
      }

      if (isDelivered) {
        deliveredOrdersCount += 1;
        deliveredUnits += qty;

        // Calculate proportional discount deduction if order had a discount
        const orderSubtotal = safeNum(order.subtotal, 1);
        const itemGross = unitPrice * qty;
        const discountAmt = safeNum(order.discount?.amount, 0);
        const itemProportionalDiscount = orderSubtotal > 0 ? (itemGross / orderSubtotal) * discountAmt : 0;

        deliveredRevenue += Math.max(0, itemGross - itemProportionalDiscount);
      } else if (isReturned) {
        returnedOrdersCount += 1;
        returnedUnits += qty;

        // Allocate return courier fee
        const orderShippingFee = safeNum(order.shippingFee ?? order.totals?.shipping, 0);
        const totalItemsInOrder = items.reduce((sum, it) => sum + safeNum(it.qty || it.quantity, 1), 0);
        const itemProportion = totalItemsInOrder > 0 ? qty / totalItemsInOrder : 1;
        returnLossesIncurred += Math.round(orderShippingFee * itemProportion);
      }
    });

    const totalCompleted = deliveredUnits + returnedUnits;
    const deliverySuccessRate = totalCompleted > 0
      ? Number(((deliveredUnits / totalCompleted) * 100).toFixed(1))
      : null;

    const returnRate = totalCompleted > 0
      ? Number(((returnedUnits / totalCompleted) * 100).toFixed(1))
      : 0;

    const deliveredCOGS = deliveredUnits * cp;
    const realizedNetCash = Math.round(deliveredRevenue - deliveredCOGS - returnLossesIncurred);

    // Remaining warehouse stock
    const sizes = getProductSizes(product);
    let stockUnits = 0;
    sizes.forEach(sz => {
      stockUnits += getAvailableStock(product, sz);
    });

    const stockCostValue = stockUnits * cp;
    const stockRetailValue = stockUnits * sp;

    // Algorithmic Badging Rules:
    // 1. Margin Leak: High returns (> 25%) eroding profits, or return losses > 20% of net gross margin
    const isMarginLeak = (returnRate > 25 && totalCompleted >= 2) || (deliveredRevenue > 0 && returnLossesIncurred > 0.20 * Math.max(1, deliveredRevenue - deliveredCOGS));

    // 2. Dead Capital: Low sales velocity over 14+ days (<= 1 units) while holding stock in warehouse > 0
    const isDeadCapital = !isMarginLeak && stockUnits > 0 && unitsSoldLast14Days <= 1;

    // 3. Scale Up (Star): High margin (>= 45%), high delivery success (>= 80%), active velocity (>= 2 units in 14d)
    const isScaleUp = !isMarginLeak && !isDeadCapital && grossMarginPct >= 45 && (deliverySuccessRate === null || deliverySuccessRate >= 80) && totalCompleted >= 2;

    let badge = 'balanced';
    let badgeLabel = 'Balanced';
    let badgeLabelAr = 'متوازن';

    if (isScaleUp) {
      badge = 'scale_up';
      badgeLabel = 'Scale Up / Star';
      badgeLabelAr = 'ستار / فرصة توسع';
    } else if (isMarginLeak) {
      badge = 'margin_leak';
      badgeLabel = 'Margin Leak';
      badgeLabelAr = 'تسريب أرباح';
    } else if (isDeadCapital) {
      badge = 'dead_capital';
      badgeLabel = 'Dead Capital';
      badgeLabelAr = 'رأس مال راكد';
    }

    // Dynamic Actionable Recommendations
    let recommendationEn = '';
    let recommendationAr = '';

    if (isScaleUp) {
      if (stockUnits <= 10) {
        recommendationEn = `⚡ Star SKU with low stock (${stockUnits} left). Reorder production batch urgently!`;
        recommendationAr = `⚡ منتج نجم بمخزون منخفض (${stockUnits} قطعة). أعد طلب دفعة إنتاج فوراً!`;
      } else {
        recommendationEn = `🌟 High margin (${grossMarginPct}%) & high delivery (${deliverySuccessRate}%). Increase ad scale.`;
        recommendationAr = `🌟 هامش مرتفع (${grossMarginPct}%) ونسبة تسليم ممتازة (${deliverySuccessRate}%). قم بزيادة ميزانية الإعلانات.`;
      }
    } else if (isMarginLeak) {
      recommendationEn = `⚠️ Return rate is ${returnRate}% (${returnLossesIncurred.toLocaleString('en-EG')} EGP lost in shipping). Audit size specs & courier delivery.`;
      recommendationAr = `⚠️ نسبة المرتجع ${returnRate}% (خسارة ${returnLossesIncurred.toLocaleString('en-EG')} ج.م شحن). راجع جدول المقاسات وملاحظات شركة الشحن.`;
    } else if (isDeadCapital) {
      recommendationEn = `💤 ${stockUnits} units idle (${stockCostValue.toLocaleString('en-EG')} EGP cost locked). Run 15-20% liquidation deal to free cash.`;
      recommendationAr = `💤 ${stockUnits} قطعة راكدة (${stockCostValue.toLocaleString('en-EG')} ج.م تكلفة مجمدة). اطلق خصم تصفية 15-20% لتسييل الكاش.`;
    } else {
      if (grossMarginPct < 35) {
        recommendationEn = `💡 Low gross margin (${grossMarginPct}%). Negotiate production cost or adjust retail price.`;
        recommendationAr = `💡 هامش ربح منخفض (${grossMarginPct}%). تفاوض على تكلفة الإنتاج أو ارفع السعر.`;
      } else {
        recommendationEn = `⚖️ Steady contributor with solid baseline performance. Maintain current replenishment.`;
        recommendationAr = `⚖️ مساهمة مستقرة وأداء متزن. حافظ على وتيرة التوريد الحالية.`;
      }
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku || 'N/A',
      imageUrl: product.imageUrl || null,
      sellingPrice: sp,
      costPrice: cp,
      grossMarginPerUnit,
      grossMarginPct,
      totalOrdersWithProduct,
      totalOrderedUnits,
      deliveredUnits,
      deliveredRevenue: Math.round(deliveredRevenue),
      deliveredCOGS: Math.round(deliveredCOGS),
      deliveredOrdersCount,
      returnedUnits,
      returnedOrdersCount,
      returnLossesIncurred,
      totalCompleted,
      deliverySuccessRate,
      returnRate,
      realizedNetCash,
      stockUnits,
      stockCostValue,
      stockRetailValue,
      unitsSoldLast14Days,
      badge,
      badgeLabel,
      badgeLabelAr,
      recommendationEn,
      recommendationAr,
      isScaleUp,
      isMarginLeak,
      isDeadCapital
    };
  });

  // Calculate summary counts
  const summary = {
    totalProducts: matrix.length,
    scaleUpCount: matrix.filter(p => p.badge === 'scale_up').length,
    marginLeakCount: matrix.filter(p => p.badge === 'margin_leak').length,
    deadCapitalCount: matrix.filter(p => p.badge === 'dead_capital').length,
    balancedCount: matrix.filter(p => p.badge === 'balanced').length,
    totalDeadCapitalCost: matrix.filter(p => p.badge === 'dead_capital').reduce((sum, p) => sum + p.stockCostValue, 0),
    totalDeadCapitalRetail: matrix.filter(p => p.badge === 'dead_capital').reduce((sum, p) => sum + p.stockRetailValue, 0),
    totalReturnLossesAllProducts: matrix.reduce((sum, p) => sum + p.returnLossesIncurred, 0),
    totalRealizedNetCash: matrix.reduce((sum, p) => sum + p.realizedNetCash, 0)
  };

  return { matrix, summary };
};

/**
 * 2. Smart Cash Flow & Working Capital Predictor
 * Computes:
 * - Current Physical Cash in Treasury
 * - Store Historical Delivery Success Rate
 * - Inbound COD Cash in 7 Days and 14 Days (Shipped & Delivered - Pending Cash adjusted for delivery rate)
 * - Safe Partner Dividends = max(0, Treasury - Upcoming 30-Day Operating Burn & Production Reserve)
 * - Working Capital Runway in Days & Status
 */
export const calculateCashFlowForecast = (products = [], orders = [], expenses = [], withdrawals = [], batchMetrics = {}) => {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // 1. Realized Cash In Treasury
  const netCollectedRevenue = safeNum(batchMetrics.netCollectedRevenue, 0);
  const totalExpensesSum = (expenses || []).reduce((sum, e) => sum + safeNum(e.amount, 0), 0);
  const totalWithdrawalsSum = (withdrawals || []).reduce((sum, w) => sum + safeNum(w.amount, 0), 0);

  const cashInTreasury = Math.max(0, netCollectedRevenue - totalExpensesSum - totalWithdrawalsSum);

  // 2. Historical Delivery Rate & Shipping Fee Baselines
  let totalDeliveredOrders = 0;
  let totalReturnedOrders = 0;
  let totalCourierFeesPaid = 0;
  let courierFeeCount = 0;

  (orders || []).forEach(o => {
    if (o.isDeleted) return;
    const isDelivered = o.status === 'Delivered - Collected' || o.status === 'Delivered' || o.status === 'Delivered - Pending Cash';
    const isReturned = o.status === 'Returned';

    if (isDelivered) totalDeliveredOrders += 1;
    if (isReturned) totalReturnedOrders += 1;

    const fee = safeNum(o.shippingFee ?? o.totals?.shipping, 0);
    if (fee > 0) {
      totalCourierFeesPaid += fee;
      courierFeeCount += 1;
    }
  });

  const completedCount = totalDeliveredOrders + totalReturnedOrders;
  const storeDeliverySuccessRate = completedCount > 0 ? totalDeliveredOrders / completedCount : 0.85;
  const avgCourierFee = courierFeeCount > 0 ? Math.round(totalCourierFeesPaid / courierFeeCount) : 60;

  // 3. Pipeline Breakdown: Shipped vs Delivered - Pending Cash
  let shippedOrdersCount = 0;
  let shippedGrossCOD = 0;
  let pendingCashOrdersCount = 0;
  let pendingCashGrossCOD = 0;
  let pendingCashCourierFees = 0;

  (orders || []).forEach(o => {
    if (o.isDeleted) return;
    const orderTotal = safeNum(o.total || o.totalAmount, 0);
    const fee = safeNum(o.shippingFee ?? o.totals?.shipping, avgCourierFee);

    if (o.status === 'Shipped') {
      shippedOrdersCount += 1;
      shippedGrossCOD += orderTotal;
    } else if (o.status === 'Delivered - Pending Cash') {
      pendingCashOrdersCount += 1;
      pendingCashGrossCOD += orderTotal;
      pendingCashCourierFees += fee;
    }
  });

  // Pending Cash is already delivered: Near 100% certainty, awaiting weekly courier disbursement
  const pendingProjectedNet = Math.max(0, pendingCashGrossCOD - pendingCashCourierFees);

  // Shipped orders: In transit, subject to historical delivery success rate
  const shippedExpectedDeliveredGross = shippedGrossCOD * storeDeliverySuccessRate;
  const shippedExpectedCourierFees = (shippedOrdersCount * storeDeliverySuccessRate * avgCourierFee) +
                                    (shippedOrdersCount * (1 - storeDeliverySuccessRate) * avgCourierFee);
  const shippedProjectedNet = Math.max(0, shippedExpectedDeliveredGross - shippedExpectedCourierFees);

  // Inbound COD Projections:
  // 7 Days: All Pending Cash + 50% of in-transit Shipped orders
  const inboundCod7Days = Math.round(pendingProjectedNet + (shippedProjectedNet * 0.50));
  // 14 Days: All Pending Cash + 100% of in-transit Shipped orders
  const inboundCod14Days = Math.round(pendingProjectedNet + shippedProjectedNet);

  // 4. Operating Expenses Burn (Last 30 Days)
  let recent30dExpenses = 0;
  (expenses || []).forEach(e => {
    const dMs = new Date(e.date || 0).getTime();
    if (dMs >= thirtyDaysAgo) {
      recent30dExpenses += safeNum(e.amount, 0);
    }
  });

  // Fallback if records are few: minimum estimated 30d operational burn
  const effectiveMonthlyBurn = Math.max(12000, recent30dExpenses);
  const dailyBurnRate = Math.round(effectiveMonthlyBurn / 30);

  // Production & Operating Reserve:
  // Buffer needed to keep ads active and have capital for replenishment
  const productionReserve = effectiveMonthlyBurn;

  // Safe Partner Dividends = max(0, Treasury - Estimated Upcoming 30-Day Expenses & Reserve)
  const safePartnerDividends = Math.max(0, cashInTreasury - productionReserve);
  const isDividendsSafe = safePartnerDividends > 0;
  const reserveDeficit = isDividendsSafe ? 0 : productionReserve - cashInTreasury;

  // 5. Working Capital Runway
  const runwayDays = dailyBurnRate > 0 ? Math.round(cashInTreasury / dailyBurnRate) : 999;
  const projectedRunwayDays = dailyBurnRate > 0 ? Math.round((cashInTreasury + inboundCod14Days) / dailyBurnRate) : 999;

  let runwayStatus = 'healthy';
  if (runwayDays < 20) runwayStatus = 'critical';
  else if (runwayDays < 45) runwayStatus = 'caution';

  return {
    cashInTreasury,
    netCollectedRevenue,
    totalExpensesSum,
    totalWithdrawalsSum,
    storeDeliverySuccessRatePct: Number((storeDeliverySuccessRate * 100).toFixed(1)),
    avgCourierFee,
    shippedOrdersCount,
    shippedGrossCOD,
    shippedProjectedNet: Math.round(shippedProjectedNet),
    pendingCashOrdersCount,
    pendingCashGrossCOD,
    pendingProjectedNet: Math.round(pendingProjectedNet),
    inboundCod7Days,
    inboundCod14Days,
    recent30dExpenses,
    effectiveMonthlyBurn,
    dailyBurnRate,
    productionReserve,
    safePartnerDividends,
    isDividendsSafe,
    reserveDeficit,
    runwayDays,
    projectedRunwayDays,
    runwayStatus
  };
};

/**
 * 3. Interactive Batch Reinvestment & What-If Simulator
 * Models future production runs, break-even sales volume, sell-through profit tiers,
 * and estimated days to full capital recovery based on store sales velocity.
 */
export const simulateBatchReinvestment = ({
  plannedUnits = 500,
  unitCost = 180,
  retailPrice = 450,
  marketingBudget = 15000,
  historicalDailyVelocity = 8,
  returnRate = 0.12
}) => {
  const units = Math.max(10, safeNum(plannedUnits, 500));
  const cost = Math.max(1, safeNum(unitCost, 180));
  const price = Math.max(cost, safeNum(retailPrice, 450));
  const ads = Math.max(0, safeNum(marketingBudget, 15000));
  const velocity = Math.max(0.5, safeNum(historicalDailyVelocity, 8));
  const retRate = Math.min(0.5, Math.max(0, safeNum(returnRate, 0.12)));

  // 1. Total Capital Required
  const manufacturingCost = units * cost;
  const totalCapitalRequired = manufacturingCost + ads;

  // 2. Break-Even Volume
  const breakEvenUnits = Math.ceil(totalCapitalRequired / price);
  const breakEvenPct = units > 0 ? Number(((breakEvenUnits / units) * 100).toFixed(1)) : 0;
  const daysToBreakEven = Math.ceil(breakEvenUnits / velocity);
  const daysToFullSellOut = Math.ceil(units / velocity);

  // 3. Sell-Through Profit Scenarios (70%, 85%, 100%)
  const tiers = [70, 85, 100];
  const scenarios = tiers.map(pct => {
    const soldUnits = Math.round(units * (pct / 100));
    const grossRevenue = soldUnits * price;
    // Estimated return courier fee waste
    const estimatedReturnedAttempts = Math.round(soldUnits * retRate);
    const returnLosses = estimatedReturnedAttempts * 60; // 60 EGP avg courier fee
    const pureProfit = grossRevenue - totalCapitalRequired - returnLosses;
    const roiPct = totalCapitalRequired > 0 ? Number(((pureProfit / totalCapitalRequired) * 100).toFixed(1)) : 0;
    const netMarginPct = grossRevenue > 0 ? Number(((pureProfit / grossRevenue) * 100).toFixed(1)) : 0;

    return {
      sellThroughPct: pct,
      soldUnits,
      grossRevenue,
      returnLosses,
      pureProfit,
      roiPct,
      netMarginPct
    };
  });

  return {
    plannedUnits: units,
    unitCost: cost,
    retailPrice: price,
    marketingBudget: ads,
    manufacturingCost,
    totalCapitalRequired,
    breakEvenUnits,
    breakEvenPct,
    daysToBreakEven,
    daysToFullSellOut,
    historicalDailyVelocity: velocity,
    returnRatePct: Number((retRate * 100).toFixed(1)),
    scenarios
  };
};

/**
 * 4. Executive Financial Health Score (0 to 100)
 * Evaluates 4 core pillars:
 * - Capital Recovery Progress (30 pts)
 * - Gross vs Net Margin Health (25 pts)
 * - Delivery & Return Control (25 pts)
 * - Liquidity & Working Capital Runway (20 pts)
 * Generates 3 dynamic, high-impact bullet recommendations for partners.
 */
export const calculateFinancialHealthScore = ({
  batchMetrics = {},
  productsContribution = {},
  cashFlow = {},
  unitEconomicsMetrics = {}
}) => {
  // Pillar 1: Capital Recovery % (Batch Payback) - Max 30 pts
  const rawRecoveryPct = safeNum(batchMetrics.rawRecoveryPct, 0);
  const recoveryScore = Math.min(30, Math.round((Math.min(100, rawRecoveryPct) / 100) * 30));

  // Pillar 2: Margin Health (Gross vs Net) - Max 25 pts
  const grossMargin = safeNum(unitEconomicsMetrics.grossMarginPct, 50);
  const netContributionMargin = safeNum(unitEconomicsMetrics.contributionMarginPct, 20);
  const grossScore = Math.min(15, Math.max(0, Math.round((grossMargin / 55) * 15)));
  const netScore = Math.min(10, Math.max(0, Math.round((netContributionMargin / 25) * 10)));
  const marginScore = grossScore + netScore;

  // Pillar 3: Delivery Success & Return Control - Max 25 pts
  const deliveryRate = safeNum(cashFlow.storeDeliverySuccessRatePct, 85);
  let deliveryScore = 5;
  if (deliveryRate >= 85) deliveryScore = 25;
  else if (deliveryRate >= 80) deliveryScore = 20;
  else if (deliveryRate >= 72) deliveryScore = 14;
  else if (deliveryRate >= 60) deliveryScore = 8;

  // Pillar 4: Liquidity & Working Capital Runway - Max 20 pts
  const runwayDays = safeNum(cashFlow.runwayDays, 30);
  let liquidityScore = 2;
  if (runwayDays >= 60) liquidityScore = 20;
  else if (runwayDays >= 45) liquidityScore = 16;
  else if (runwayDays >= 30) liquidityScore = 12;
  else if (runwayDays >= 15) liquidityScore = 7;

  // Total Composite Score
  const totalScore = Math.min(100, Math.max(0, recoveryScore + marginScore + deliveryScore + liquidityScore));

  let grade = 'A+';
  let gradeLabel = 'Grade A+ · Outstanding';
  let gradeLabelAr = 'تصنيف A+ · صحة مالية ممتازة';
  let gradeColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';

  if (totalScore < 50) {
    grade = 'D';
    gradeLabel = 'Grade D · Capital Stress';
    gradeLabelAr = 'تصنيف D · ضغط سيولة يحتاج تدخل';
    gradeColor = 'text-red-600 bg-red-50 border-red-200';
  } else if (totalScore < 70) {
    grade = 'C';
    gradeLabel = 'Grade C · Moderate Risk';
    gradeLabelAr = 'تصنيف C · مخاطر تشغيلية متوسطة';
    gradeColor = 'text-amber-600 bg-amber-50 border-amber-200';
  } else if (totalScore < 85) {
    grade = 'B';
    gradeLabel = 'Grade B · Stable Growth';
    gradeLabelAr = 'تصنيف B · نمو مستقر ومربح';
    gradeColor = 'text-blue-600 bg-blue-50 border-blue-200';
  }

  const pillars = [
    {
      id: 'capital_recovery',
      labelEn: 'Capital Recovery',
      labelAr: 'استرداد رأس المال',
      score: recoveryScore,
      max: 30,
      pct: Math.round((recoveryScore / 30) * 100),
      detail: `${rawRecoveryPct.toFixed(1)}% achieved`
    },
    {
      id: 'margin_health',
      labelEn: 'Margin Health',
      labelAr: 'هوامش الربحية',
      score: marginScore,
      max: 25,
      pct: Math.round((marginScore / 25) * 100),
      detail: `${grossMargin}% gross / ${netContributionMargin}% net`
    },
    {
      id: 'delivery_control',
      labelEn: 'Delivery Control',
      labelAr: 'ضبط التسليم والمرتجع',
      score: deliveryScore,
      max: 25,
      pct: Math.round((deliveryScore / 25) * 100),
      detail: `${deliveryRate}% success rate`
    },
    {
      id: 'liquidity_runway',
      labelEn: 'Working Capital Runway',
      labelAr: 'مدرج السيولة التشغيلية',
      score: liquidityScore,
      max: 20,
      pct: Math.round((liquidityScore / 20) * 100),
      detail: `${runwayDays} days buffer`
    }
  ];

  // Generate 3 High-Impact Action Points for Partners
  const actionPoints = [];
  const matrix = productsContribution.matrix || [];

  // 1. Check for stagnant dead capital
  const deadProducts = matrix.filter(p => p.badge === 'dead_capital').sort((a, b) => b.stockCostValue - a.stockCostValue);
  if (deadProducts.length > 0) {
    const topDead = deadProducts[0];
    actionPoints.push({
      type: 'dead_capital',
      icon: 'Tag',
      textEn: `Liquidate ${topDead.stockUnits} units of "${topDead.name}" to unlock ${topDead.stockCostValue.toLocaleString('en-EG')} EGP in stagnant working capital.`,
      textAr: `صفِّ ${topDead.stockUnits} قطعة من "${topDead.name}" لتسييل ${topDead.stockCostValue.toLocaleString('en-EG')} ج.م رأس مال راكد بالمخزن.`
    });
  }

  // 2. Check COD Inbound & Settlement
  if (cashFlow.inboundCod7Days > 0) {
    actionPoints.push({
      type: 'inbound_cod',
      icon: 'Truck',
      textEn: `${cashFlow.inboundCod7Days.toLocaleString('en-EG')} EGP in COD is in transit/pending settlement (${cashFlow.pendingCashOrdersCount} delivered awaiting payout).`,
      textAr: `${cashFlow.inboundCod7Days.toLocaleString('en-EG')} ج.م كاش COD قيد التحصيل (${cashFlow.pendingCashOrdersCount} شحنة تم تسليمها بانتظار توريد المندوب).`
    });
  }

  // 3. Safe Dividends Recommendation
  if (cashFlow.isDividendsSafe) {
    actionPoints.push({
      type: 'safe_dividends',
      icon: 'CheckCircle2',
      textEn: `Safe dividend distribution capacity is ${cashFlow.safePartnerDividends.toLocaleString('en-EG')} EGP while preserving full 30-day operating buffer.`,
      textAr: `يمكن توزيع أرباح بأمان حتى ${cashFlow.safePartnerDividends.toLocaleString('en-EG')} ج.م مع الحفاظ على كامل مصاريف التشغيل لـ 30 يوماً.`
    });
  } else {
    actionPoints.push({
      type: 'reserve_defense',
      icon: 'ShieldAlert',
      textEn: `Pause partner dividends: Retain treasury liquidity to fund upcoming ad spend and maintain ${cashFlow.productionReserve.toLocaleString('en-EG')} EGP production reserve.`,
      textAr: `احتجز الأرباح حالياً: حافظ على السيولة لتمويل الإعلانات وتأمين احتياطي تشغيل بقيمة ${cashFlow.productionReserve.toLocaleString('en-EG')} ج.م للدفعة القادمة.`
    });
  }

  // 4. Star SKU Restock if actionPoints length < 3
  if (actionPoints.length < 3) {
    const starLowStock = matrix.filter(p => p.badge === 'scale_up' && p.stockUnits <= 8);
    if (starLowStock.length > 0) {
      const topStar = starLowStock[0];
      actionPoints.push({
        type: 'restock_star',
        icon: 'Sparkles',
        textEn: `High-margin star "${topStar.name}" has only ${topStar.stockUnits} units remaining. Restock now to capture peak profit.`,
        textAr: `المنتج النجم "${topStar.name}" متبقي منه ${topStar.stockUnits} قطع فقط. أعد التصنيع فوراً لتفادي ضياع المبيعات.`
      });
    }
  }

  // 5. Margin Leak Warning if still < 3
  if (actionPoints.length < 3) {
    const leakProducts = matrix.filter(p => p.badge === 'margin_leak').sort((a, b) => b.returnLossesIncurred - a.returnLossesIncurred);
    if (leakProducts.length > 0) {
      const topLeak = leakProducts[0];
      actionPoints.push({
        type: 'margin_leak',
        icon: 'AlertTriangle',
        textEn: `"${topLeak.name}" has high return losses (${topLeak.returnLossesIncurred.toLocaleString('en-EG')} EGP wasted). Review sizing or courier handling.`,
        textAr: `المنتج "${topLeak.name}" يسبب تسريب أرباح (خسارة ${topLeak.returnLossesIncurred.toLocaleString('en-EG')} ج.م شحن مرتجع). راجع المقاسات والشحن.`
      });
    }
  }

  // Take top 3
  const finalActionPoints = actionPoints.slice(0, 3);

  return {
    totalScore,
    grade,
    gradeLabel,
    gradeLabelAr,
    gradeColor,
    pillars,
    actionPoints: finalActionPoints
  };
};
