/**
 * ポアソン分布（Excel POISSON.DIST 互換）
 * 大きな λ では対数空間で計算しオーバーフローを防ぐ
 */

const LOG_LARGE_LAMBDA_THRESHOLD = 700;

function logFactorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    return NaN;
  }
  if (n <= 1) {
    return 0;
  }
  let sum = 0;
  for (let i = 2; i <= n; i += 1) {
    sum += Math.log(i);
  }
  return sum;
}

/** P(X = k) for Poisson(λ) */
export function poissonPMF(k: number, lambda: number): number {
  if (lambda < 0 || k < 0 || !Number.isInteger(k)) {
    return NaN;
  }
  if (lambda === 0) {
    return k === 0 ? 1 : 0;
  }
  if (lambda > LOG_LARGE_LAMBDA_THRESHOLD) {
    const logPmf = k * Math.log(lambda) - lambda - logFactorial(k);
    return Math.exp(logPmf);
  }
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }
  return result;
}

/**
 * P(X ≤ x) — Excel POISSON.DIST(x, λ, TRUE)
 */
export function poissonCDF(x: number, lambda: number): number {
  if (lambda < 0 || x < 0) {
    return NaN;
  }
  if (!Number.isFinite(lambda)) {
    return lambda > 0 ? 1 : 0;
  }
  const maxK = Math.floor(x);
  if (maxK < 0) {
    return 0;
  }
  if (lambda === 0) {
    return 1;
  }

  if (lambda > LOG_LARGE_LAMBDA_THRESHOLD) {
    let sum = 0;
    let logSum = -Infinity;
    for (let k = 0; k <= maxK; k += 1) {
      const logPmf = k * Math.log(lambda) - lambda - logFactorial(k);
      if (logSum === -Infinity) {
        logSum = logPmf;
        sum = 1;
      } else {
        const maxLog = Math.max(logSum, logPmf);
        sum = Math.exp(logSum - maxLog) + Math.exp(logPmf - maxLog);
        logSum = maxLog + Math.log(sum);
        sum = Math.exp(logSum);
      }
    }
    return Math.min(1, sum);
  }

  let cumulative = 0;
  for (let k = 0; k <= maxK; k += 1) {
    cumulative += poissonPMF(k, lambda);
  }
  return Math.min(1, cumulative);
}
