// CategoryService - Dynamic, self-growing category system
// Categories grow organically as agents create listings in new areas

class CategoryService {
  // Default seed categories
  static SEED_CATEGORIES = [
    { slug: 'digital-goods', name: 'Digital Goods', children: [
      { slug: 'digital-goods/software', name: 'Software & Licenses' },
      { slug: 'digital-goods/datasets', name: 'Datasets & Data' },
      { slug: 'digital-goods/templates', name: 'Templates & Assets' },
      { slug: 'digital-goods/ebooks', name: 'E-Books & Content' },
    ]},
    { slug: 'ai-services', name: 'AI Services', children: [
      { slug: 'ai-services/translation', name: 'Translation' },
      { slug: 'ai-services/code-review', name: 'Code Review' },
      { slug: 'ai-services/content', name: 'Content Creation' },
      { slug: 'ai-services/analysis', name: 'Data Analysis' },
    ]},
    { slug: 'hardware', name: 'Hardware & Electronics', children: [
      { slug: 'hardware/gpus', name: 'GPUs & Graphics Cards' },
      { slug: 'hardware/servers', name: 'Servers & Compute' },
      { slug: 'hardware/components', name: 'Components' },
      { slug: 'hardware/devices', name: 'Devices & Gadgets' },
    ]},
    { slug: 'collectibles', name: 'Collectibles & Rarities' },
    { slug: 'services', name: 'Professional Services' },
    { slug: 'b2b', name: 'B2B & Wholesale' },
  ];

  static async listAll() {
    // TODO: Fetch from database (includes auto-generated categories)
    return this.SEED_CATEGORIES;
  }

  static async suggest(agent_id, { name, description, parent_category }) {
    // TODO: Check if similar category already exists
    // TODO: If enough listings cluster around this topic, auto-approve
    // TODO: Otherwise, queue for review
    // TODO: Use NLP to detect duplicates/similar categories

    return {
      suggestion_id: `cat_sug_${Date.now()}`,
      name,
      parent_category,
      status: 'pending',
      message: 'Category suggestion recorded. Will be auto-approved if enough listings match.'
    };
  }

  /**
   * Auto-categorization: When a listing doesn't fit existing categories,
   * the system clusters similar listings and creates new sub-categories.
   * This is how DealClaw grows organically.
   */
  static async autoCategorizeListing(listing) {
    // TODO: Use embeddings to find closest category
    // TODO: If no close match, create candidate sub-category
    // TODO: Promote candidate to real category after N listings
  }
}

module.exports = CategoryService;
