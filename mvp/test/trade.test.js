// Unit tests for TradeService fee calculation and business logic
const TradeService = require('../src/services/TradeService');

describe('TradeService.calculateFee', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.CLAWCOIN_FEE_RATE = '0.10';
    process.env.CLAWCOIN_MIN_FEE = '0.5';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('calculates 10% of price gap for newcomer tier', () => {
    // Buyer max: 1000, Seller min: 800 → gap: 200 → fee: 20
    const fee = TradeService.calculateFee(1000, 800, 'newcomer');
    expect(fee).toBe(20);
  });

  test('calculates 8% of price gap for trusted tier', () => {
    // gap: 200 → fee: 16
    const fee = TradeService.calculateFee(1000, 800, 'trusted');
    expect(fee).toBe(16);
  });

  test('calculates 7% of price gap for verified tier', () => {
    // gap: 200 → fee: 14
    const fee = TradeService.calculateFee(1000, 800, 'verified');
    expect(fee).toBeCloseTo(14, 2);
  });

  test('calculates 5% of price gap for elite tier', () => {
    // gap: 200 → fee: 10
    const fee = TradeService.calculateFee(1000, 800, 'elite');
    expect(fee).toBe(10);
  });

  test('returns minimum fee when gap is zero', () => {
    const fee = TradeService.calculateFee(800, 800, 'newcomer');
    expect(fee).toBe(0.5);
  });

  test('returns minimum fee when gap is negative', () => {
    const fee = TradeService.calculateFee(700, 800, 'newcomer');
    expect(fee).toBe(0.5);
  });

  test('returns minimum fee when calculated fee is below minimum', () => {
    // gap: 1 → fee: 0.1 → below min fee of 0.5
    const fee = TradeService.calculateFee(801, 800, 'newcomer');
    expect(fee).toBe(0.5);
  });

  test('handles large price gaps correctly', () => {
    // gap: 9000 → 10% → 900
    const fee = TradeService.calculateFee(10000, 1000, 'newcomer');
    expect(fee).toBe(900);
  });

  test('defaults to newcomer rate for unknown tier', () => {
    const fee = TradeService.calculateFee(1000, 800, 'unknown_tier');
    expect(fee).toBe(20); // 10% of 200
  });

  test('handles decimal prices correctly', () => {
    const fee = TradeService.calculateFee(100.5, 80.3, 'newcomer');
    expect(fee).toBeCloseTo(2.02, 2); // 10% of 20.2
  });
});

describe('TradeService validation logic', () => {
  test('fee rate matches DealClaw documentation', () => {
    // PRD: "DealClaw's fee is 10% of the price gap"
    // Example from PRD: 800 CC min, 1000 CC max → 200 CC gap → 20 CC fee
    const fee = TradeService.calculateFee(1000, 800, 'newcomer');
    expect(fee).toBe(20);
  });

  test('seller receives agreed price minus fee', () => {
    const agreedPrice = 900;
    const fee = TradeService.calculateFee(1000, 800, 'newcomer'); // 20 CC
    const sellerReceives = agreedPrice - fee;
    expect(sellerReceives).toBe(880);
  });

  test('tier discount is significant for high-volume sellers', () => {
    const newcomerFee = TradeService.calculateFee(10000, 5000, 'newcomer'); // 500
    const eliteFee = TradeService.calculateFee(10000, 5000, 'elite'); // 250
    expect(eliteFee).toBe(newcomerFee / 2); // Elite saves 50%
  });
});
