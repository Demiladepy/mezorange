/**
 * Uniswap V3 tick / sqrtPrice helpers for charting and display.
 */

export function tickToPrice(
  tick: number,
  decimals0: number,
  decimals1: number,
): number {
  const raw = Math.pow(1.0001, tick);
  return raw * Math.pow(10, decimals0 - decimals1);
}

export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number,
): number {
  const ratio = Number(sqrtPriceX96) / 2 ** 96;
  const raw = ratio * ratio;
  return raw * Math.pow(10, decimals0 - decimals1);
}

export function buildRangeChartData(
  tickLower: number,
  tickUpper: number,
  currentTick: number,
  decimals0: number,
  decimals1: number,
  points = 40,
) {
  const minTick = Math.min(tickLower, currentTick) - 200;
  const maxTick = Math.max(tickUpper, currentTick) + 200;
  const step = Math.max(1, Math.floor((maxTick - minTick) / points));

  const data: Array<{
    tick: number;
    price: number;
    rangeMin: number | null;
    rangeMax: number | null;
    current: number | null;
  }> = [];

  for (let tick = minTick; tick <= maxTick; tick += step) {
    const price = tickToPrice(tick, decimals0, decimals1);
    const inRange = tick >= tickLower && tick <= tickUpper;
    data.push({
      tick,
      price,
      rangeMin: inRange ? tickToPrice(tickLower, decimals0, decimals1) : null,
      rangeMax: inRange ? tickToPrice(tickUpper, decimals0, decimals1) : null,
      current:
        Math.abs(tick - currentTick) <= step / 2
          ? tickToPrice(currentTick, decimals0, decimals1)
          : null,
    });
  }

  return data;
}
