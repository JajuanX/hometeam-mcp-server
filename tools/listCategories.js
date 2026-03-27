import Category from '../models/Category.js';
import logUsage from '../utils/logUsage.js';

export const listCategoriesSchema = {
  description: 'List all business categories available in the Hometeam directory.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const listCategoriesHandler = async (input = {}, requestMeta = {}) => {
  const startedAt = Date.now();
  const categories = await Category.find({}).sort({ name: 1 }).lean();

  logUsage({
    tool: 'list_categories',
    input,
    businessesReturned: [],
    apiKey: requestMeta.apiKey || null,
    source: requestMeta.source || 'unknown',
    responseTimeMs: Date.now() - startedAt,
  });

  return {
    categories: categories.map((category) => ({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
    })),
    total: categories.length,
  };
};
