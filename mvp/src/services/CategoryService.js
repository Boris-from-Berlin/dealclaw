// CategoryService - Dynamic, self-growing category system

const { query } = require('../db');
const logger = require('../middleware/logger');

class CategoryService {
  /**
   * List all active categories as a tree.
   */
  static async listAll() {
    const { rows } = await query(`
      SELECT slug, name, description, parent_slug, listing_count, auto_generated
      FROM categories
      WHERE status = 'active'
      ORDER BY CASE WHEN parent_slug IS NULL THEN 0 ELSE 1 END, name ASC
    `);

    // Build tree structure
    const roots = [];
    const childrenMap = {};

    for (const cat of rows) {
      const node = {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        listing_count: cat.listing_count,
        auto_generated: !!cat.auto_generated,
        children: [],
      };

      if (!cat.parent_slug) {
        roots.push(node);
      } else {
        if (!childrenMap[cat.parent_slug]) childrenMap[cat.parent_slug] = [];
        childrenMap[cat.parent_slug].push(node);
      }
    }

    // Attach children
    for (const root of roots) {
      root.children = childrenMap[root.slug] || [];
    }

    return roots;
  }

  /**
   * Suggest a new category (agents can propose new categories).
   */
  static async suggest(agentId, { name, description, parent_category }) {
    // Check for duplicates
    const existing = await query(
      'SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1)', [name]
    );
    if (existing.rows.length > 0) {
      const err = new Error(`A category named "${name}" already exists`);
      err.status = 409;
      throw err;
    }

    // Check parent exists
    if (parent_category) {
      const parent = await query('SELECT 1 FROM categories WHERE slug = $1', [parent_category]);
      if (parent.rows.length === 0) {
        const err = new Error(`Parent category "${parent_category}" not found`);
        err.status = 400;
        throw err;
      }
    }

    const { rows: [suggestion] } = await query(`
      INSERT INTO category_suggestions (agent_id, name, description, parent_slug, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id
    `, [agentId, name, description || null, parent_category || null]);

    // Auto-approve if enough similar suggestions exist (3+)
    const { rows: [count] } = await query(
      "SELECT COUNT(*) FROM category_suggestions WHERE LOWER(name) = LOWER($1) AND status = 'pending'",
      [name]
    );

    let status = 'pending';
    if (parseInt(count.count) >= 3) {
      // Auto-approve: create the category
      const slug = parent_category
        ? `${parent_category}/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      await query(`
        INSERT INTO categories (slug, name, description, parent_slug, auto_generated, status)
        VALUES ($1, $2, $3, $4, 1, 'active')
        ON CONFLICT (slug) DO NOTHING
      `, [slug, name, description, parent_category]);

      // Mark all pending suggestions as approved
      await query(
        "UPDATE category_suggestions SET status = 'approved' WHERE LOWER(name) = LOWER($1) AND status = 'pending'",
        [name]
      );

      status = 'auto_approved';
      logger.info('Category auto-approved', { name, slug });
    }

    logger.info('Category suggested', { agent_id: agentId, name, status });

    return {
      suggestion_id: `cat_sug_${suggestion.id}`,
      name,
      parent_category,
      status,
      message: status === 'auto_approved'
        ? 'Category has been auto-approved and is now active!'
        : 'Category suggestion recorded. Will be auto-approved when 3+ agents suggest it.',
    };
  }
}

module.exports = CategoryService;
