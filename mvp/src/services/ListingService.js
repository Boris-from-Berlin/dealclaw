// ListingService - Listing CRUD, search, compliance checks
// Full PostgreSQL implementation

const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const logger = require('../middleware/logger');
const { checkListingCompliance } = require('../compliance/rules');

class ListingService {
  /**
   * Create a new listing.
   */
  static async create(agentId, data) {
    const listingId = `lst_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    // Verify category exists (if provided)
    if (data.category_slug) {
      const cat = await query('SELECT 1 FROM categories WHERE slug = $1 AND status = $2', [data.category_slug, 'active']);
      if (cat.rows.length === 0) {
        const err = new Error(`Category "${data.category_slug}" not found`);
        err.status = 400;
        throw err;
      }
    }

    // Compliance check — only legal items allowed
    const compliance = checkListingCompliance(data.title, data.description || '', data.tags || []);
    if (!compliance.allowed) {
      const err = new Error(`Listing blocked: ${compliance.reason}`);
      err.status = 403;
      err.compliance = compliance;
      throw err;
    }
    if (compliance.restricted) {
      logger.warn('Restricted listing created', { listing_id: listingId, category: compliance.category, conditions: compliance.conditions });
    }

    const displayPrice = data.display_price || data.min_price;

    await query(`
      INSERT INTO listings (listing_id, agent_id, title, description, min_price, display_price,
                            category_slug, fulfillment_type, condition, images, tags, shipping_from, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
    `, [
      listingId, agentId, data.title, data.description || '',
      data.min_price, displayPrice,
      data.category_slug || null, data.fulfillment_type,
      data.condition || null, data.images || [],
      data.tags || [], data.shipping_from || null,
    ]);

    // Increment category listing count
    if (data.category_slug) {
      await query(
        'UPDATE categories SET listing_count = listing_count + 1 WHERE slug = $1',
        [data.category_slug]
      );
    }

    logger.info('Listing created', { listing_id: listingId, agent_id: agentId });

    return {
      listing_id: listingId,
      agent_id: agentId,
      title: data.title,
      description: data.description,
      display_price: displayPrice,
      category_slug: data.category_slug,
      fulfillment_type: data.fulfillment_type,
      condition: data.condition,
      status: 'active',
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Search listings with filters and sorting.
   */
  static async search(params) {
    const conditions = ['l.status = $1'];
    const values = ['active'];
    let idx = 2;

    if (params.q) {
      conditions.push(`l.title ILIKE $${idx}`);
      values.push(`%${params.q}%`);
      idx++;
    }

    if (params.category) {
      conditions.push(`(l.category_slug = $${idx} OR l.category_slug LIKE $${idx + 1})`);
      values.push(params.category, `${params.category}/%`);
      idx += 2;
    }

    if (params.min_price !== undefined) {
      conditions.push(`l.display_price >= $${idx}`);
      values.push(params.min_price);
      idx++;
    }
    if (params.max_price !== undefined) {
      conditions.push(`l.display_price <= $${idx}`);
      values.push(params.max_price);
      idx++;
    }

    if (params.fulfillment_type) {
      conditions.push(`l.fulfillment_type = $${idx}`);
      values.push(params.fulfillment_type);
      idx++;
    }

    if (params.condition) {
      conditions.push(`l.condition = $${idx}`);
      values.push(params.condition);
      idx++;
    }

    const sortMap = {
      'price_asc': 'l.display_price ASC',
      'price_desc': 'l.display_price DESC',
      'newest': 'l.created_at DESC',
      'relevance': 'l.view_count DESC',
    };
    const orderBy = sortMap[params.sort] || sortMap['newest'];
    const where = conditions.join(' AND ');
    const limit = params.limit || 25;
    const offset = params.offset || 0;

    const countResult = await query(`SELECT COUNT(*) FROM listings l WHERE ${where}`, values);
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await query(`
      SELECT l.listing_id, l.title, l.description, l.display_price, l.category_slug,
             l.fulfillment_type, l.condition, l.images, l.tags, l.shipping_from,
             l.view_count, l.created_at,
             a.name as agent_name, a.reputation_score, a.tier as agent_tier
      FROM listings l
      JOIN agents a ON l.agent_id = a.agent_id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...values, limit, offset]);

    return {
      listings: rows.map(r => ({
        listing_id: r.listing_id,
        title: r.title,
        description: r.description,
        price: parseFloat(r.display_price),
        category: r.category_slug,
        fulfillment_type: r.fulfillment_type,
        condition: r.condition,
        images: r.images,
        tags: r.tags,
        shipping_from: r.shipping_from,
        views: r.view_count,
        seller: { name: r.agent_name, reputation: r.reputation_score, tier: r.agent_tier },
        created_at: r.created_at,
      })),
      total, limit, offset,
    };
  }

  /**
   * Get a single listing by ID (increments view count).
   */
  static async getById(listingId) {
    await query('UPDATE listings SET view_count = view_count + 1 WHERE listing_id = $1', [listingId]);

    const { rows } = await query(`
      SELECT l.*, a.name as agent_name, a.reputation_score, a.tier as agent_tier
      FROM listings l JOIN agents a ON l.agent_id = a.agent_id
      WHERE l.listing_id = $1
    `, [listingId]);

    if (rows.length === 0) {
      const err = new Error('Listing not found');
      err.status = 404;
      throw err;
    }

    const l = rows[0];
    return {
      listing_id: l.listing_id, title: l.title, description: l.description,
      price: parseFloat(l.display_price), category: l.category_slug,
      fulfillment_type: l.fulfillment_type, condition: l.condition,
      images: l.images, tags: l.tags, shipping_from: l.shipping_from,
      views: l.view_count, status: l.status,
      seller: { agent_id: l.agent_id, name: l.agent_name, reputation: l.reputation_score, tier: l.agent_tier },
      created_at: l.created_at, updated_at: l.updated_at,
    };
  }

  /**
   * Update a listing (owner only).
   */
  static async update(agentId, listingId, updates) {
    const existing = await query('SELECT agent_id FROM listings WHERE listing_id = $1', [listingId]);
    if (existing.rows.length === 0) { const err = new Error('Listing not found'); err.status = 404; throw err; }
    if (existing.rows[0].agent_id !== agentId) { const err = new Error('Not authorized'); err.status = 403; throw err; }

    const fields = [];
    const values = [];
    let idx = 1;
    for (const field of ['title', 'description', 'min_price', 'display_price', 'status', 'tags']) {
      if (updates[field] !== undefined) { fields.push(`${field} = $${idx++}`); values.push(updates[field]); }
    }
    if (fields.length === 0) return this.getById(listingId);

    fields.push('updated_at = NOW()');
    values.push(listingId);
    await query(`UPDATE listings SET ${fields.join(', ')} WHERE listing_id = $${idx}`, values);
    return this.getById(listingId);
  }

  /**
   * Soft-delete a listing (owner only).
   */
  static async delete(agentId, listingId) {
    const existing = await query('SELECT agent_id, category_slug FROM listings WHERE listing_id = $1', [listingId]);
    if (existing.rows.length === 0) { const err = new Error('Listing not found'); err.status = 404; throw err; }
    if (existing.rows[0].agent_id !== agentId) { const err = new Error('Not authorized'); err.status = 403; throw err; }

    await query("UPDATE listings SET status = 'closed', updated_at = NOW() WHERE listing_id = $1", [listingId]);
    if (existing.rows[0].category_slug) {
      await query('UPDATE categories SET listing_count = GREATEST(listing_count - 1, 0) WHERE slug = $1', [existing.rows[0].category_slug]);
    }
    return true;
  }
}

module.exports = ListingService;
