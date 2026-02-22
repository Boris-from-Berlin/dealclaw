// Unit tests for input validation schemas
const { schemas } = require('../src/validation/schemas');

describe('Agent registration validation', () => {
  const schema = schemas.registerAgent;

  test('accepts valid agent registration', () => {
    const { error } = schema.validate({
      name: 'MyBot-01',
      framework: 'openclaw',
      capabilities: ['buy', 'sell'],
    });
    expect(error).toBeUndefined();
  });

  test('rejects name with special characters', () => {
    const { error } = schema.validate({
      name: 'My Bot!@#',
      framework: 'openclaw',
      capabilities: ['buy'],
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain('name');
  });

  test('rejects short name', () => {
    const { error } = schema.validate({
      name: 'AB',
      framework: 'openclaw',
      capabilities: ['buy'],
    });
    expect(error).toBeDefined();
  });

  test('rejects invalid framework', () => {
    const { error } = schema.validate({
      name: 'ValidBot',
      framework: 'invalid_framework',
      capabilities: ['buy'],
    });
    expect(error).toBeDefined();
  });

  test('rejects empty capabilities', () => {
    const { error } = schema.validate({
      name: 'ValidBot',
      framework: 'openclaw',
      capabilities: [],
    });
    expect(error).toBeDefined();
  });

  test('accepts all valid frameworks', () => {
    for (const fw of ['openclaw', 'claude_mcp', 'gpt', 'gemini', 'custom']) {
      const { error } = schema.validate({
        name: 'TestBot',
        framework: fw,
        capabilities: ['buy'],
      });
      expect(error).toBeUndefined();
    }
  });
});

describe('Listing creation validation', () => {
  const schema = schemas.createListing;

  test('accepts valid listing', () => {
    const { error } = schema.validate({
      title: 'NVIDIA RTX 4090 24GB',
      min_price: 800,
      fulfillment_type: 'physical',
      condition: 'new',
    });
    expect(error).toBeUndefined();
  });

  test('rejects missing title', () => {
    const { error } = schema.validate({
      min_price: 800,
      fulfillment_type: 'physical',
    });
    expect(error).toBeDefined();
  });

  test('rejects negative price', () => {
    const { error } = schema.validate({
      title: 'Valid Item',
      min_price: -10,
      fulfillment_type: 'digital',
    });
    expect(error).toBeDefined();
  });

  test('rejects invalid fulfillment type', () => {
    const { error } = schema.validate({
      title: 'Valid Item',
      min_price: 100,
      fulfillment_type: 'invalid',
    });
    expect(error).toBeDefined();
  });

  test('limits images to 10', () => {
    const { error } = schema.validate({
      title: 'Valid Item',
      min_price: 100,
      fulfillment_type: 'digital',
      images: Array(11).fill('https://example.com/img.jpg'),
    });
    expect(error).toBeDefined();
  });
});

describe('Negotiate validation', () => {
  const schema = schemas.negotiate;

  test('accepts valid offer', () => {
    const { error } = schema.validate({
      listing_id: 'lst_abc123',
      action: 'offer',
      offer_amount: 500,
    });
    expect(error).toBeUndefined();
  });

  test('requires offer_amount for offer action', () => {
    const { error } = schema.validate({
      listing_id: 'lst_abc123',
      action: 'offer',
    });
    expect(error).toBeDefined();
  });

  test('allows message without offer_amount', () => {
    const { error } = schema.validate({
      listing_id: 'lst_abc123',
      trade_id: 'trd_xyz789',
      action: 'message',
      message: 'Is this still available?',
    });
    expect(error).toBeUndefined();
  });
});

describe('Confirm delivery validation', () => {
  const schema = schemas.confirmDelivery;

  test('accepts valid delivery confirmation', () => {
    const { error } = schema.validate({
      rating: 5,
      review: 'Great transaction!',
    });
    expect(error).toBeUndefined();
  });

  test('rejects rating above 5', () => {
    const { error } = schema.validate({ rating: 6 });
    expect(error).toBeDefined();
  });

  test('rejects rating below 1', () => {
    const { error } = schema.validate({ rating: 0 });
    expect(error).toBeDefined();
  });

  test('requires rating', () => {
    const { error } = schema.validate({ review: 'test' });
    expect(error).toBeDefined();
  });
});
