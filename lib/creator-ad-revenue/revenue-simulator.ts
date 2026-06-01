export type AdRevenueSimulationInput = {
  grossRevenueVnd: number;
  invalidTrafficAdjustmentVnd: number;
  taxAndFeesVnd: number;
  creatorPoolPercent: number;
  reservePercent: number;
};

export type AdRevenueSimulationResult = {
  netValidRevenueVnd: number;
  creatorPoolVnd: number;
  reserveVnd: number;
  distributableVnd: number;
  platformRetainedVnd: number;
};

export function simulateAdRevenueSplit(
  input: AdRevenueSimulationInput
): AdRevenueSimulationResult {
  const netValidRevenueVnd = Math.max(
    0,
    input.grossRevenueVnd - input.invalidTrafficAdjustmentVnd - input.taxAndFeesVnd
  );
  const creatorPoolVnd = netValidRevenueVnd * (input.creatorPoolPercent / 100);
  const reserveVnd = creatorPoolVnd * (input.reservePercent / 100);
  const distributableVnd = creatorPoolVnd - reserveVnd;
  const platformRetainedVnd = netValidRevenueVnd - creatorPoolVnd;

  return {
    netValidRevenueVnd,
    creatorPoolVnd,
    reserveVnd,
    distributableVnd,
    platformRetainedVnd
  };
}
