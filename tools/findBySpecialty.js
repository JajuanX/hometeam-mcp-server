import Business from '../models/Business.js';
import Category from '../models/Category.js';
import Neighborhood from '../models/Neighborhood.js';
import logUsage from '../utils/logUsage.js';
import {
  COUNTY_VALUES,
  escapeRegex,
  getRatingMap,
  safeSnippet,
  toBusinessUrl,
} from './helpers.js';

const KEYWORD_MAP = {
  'hair-beauty': ['braid', 'braids', 'locs', 'hair', 'barber', 'fade', 'haircut', 'salon', 'stylist'],
  'restaurants-food': ['food', 'restaurant', 'catering', 'plate', 'plates', 'chef', 'meal', 'brunch'],
  'professional-services': ['tax', 'accounting', 'legal', 'bookkeeping', 'consulting', 'lawyer'],
  'auto-services': ['mechanic', 'car', 'auto', 'tire', 'oil change', 'detailing'],
  'fitness-training': ['trainer', 'gym', 'fitness', 'workout', 'conditioning'],
};

export const findBySpecialtySchema = {
  description: 'Find Black-owned businesses that match a specific need or occasion. Describe what you are looking for in natural language and this tool will find the best matches.',
  inputSchema: {
    type: 'object',
    required: ['need'],
    properties: {
      need: {
        type: 'string',
        description: 'What the user is looking for (e.g., someone to do box braids, catering for a birthday party, tax preparation for small business, barber who can do fades)',
      },
      location: {
        type: 'string',
        description: 'Preferred area (neighborhood name or county)',
      },
    },
  },
};

const getMatchedCategorySlugs = (needText) => {
  const normalizedNeed = needText.toLowerCase();

  return Object.entries(KEYWORD_MAP)
    .filter(([, keywords]) => keywords.some((keyword) => normalizedNeed.includes(keyword)))
    .map(([slug]) => slug);
};

const resolveLocationFilter = async (location) => {
  if (!location || !location.trim()) {
    return {};
  }

  const normalizedLocation = location.trim();
  const countyMatch = COUNTY_VALUES.find((county) => county.toLowerCase() === normalizedLocation.toLowerCase());

  if (countyMatch) {
    const countyNeighborhoods = await Neighborhood.find({ county: countyMatch }).select('_id').lean();
    return {
      neighborhood: { $in: countyNeighborhoods.map((item) => item._id) },
      locationContext: countyMatch,
    };
  }

  const locationRegex = new RegExp(`^${escapeRegex(normalizedLocation)}$`, 'i');
  const neighborhood = await Neighborhood.findOne({
    $or: [{ slug: normalizedLocation.toLowerCase() }, { name: locationRegex }],
  }).select('_id name county slug').lean();

  if (!neighborhood) {
    return {
      locationContext: normalizedLocation,
    };
  }

  return {
    neighborhood: neighborhood._id,
    locationContext: `${neighborhood.name}, ${neighborhood.county}`,
  };
};

export const findBySpecialtyHandler = async (input = {}, requestMeta = {}) => {
  const startedAt = Date.now();
  const { need, location } = input;

  if (!need || !need.trim()) {
    return {
      error: 'The "need" field is required.',
    };
  }

  const matchedCategorySlugs = getMatchedCategorySlugs(need);
  const matchedCategories = matchedCategorySlugs.length > 0
    ? await Category.find({ slug: { $in: matchedCategorySlugs } }).select('_id slug name').lean()
    : [];

  const locationFilter = await resolveLocationFilter(location);
  const regex = new RegExp(escapeRegex(need.trim()), 'i');

  const query = {
    status: 'active',
    ...(locationFilter.neighborhood ? { neighborhood: locationFilter.neighborhood } : {}),
  };

  if (matchedCategories.length > 0) {
    query.$or = [
      { category: { $in: matchedCategories.map((category) => category._id) } },
      { name: regex },
      { description: regex },
    ];
  } else {
    query.$or = [{ name: regex }, { description: regex }];
  }

  const businesses = await Business.find(query)
    .populate('category', 'name slug')
    .populate('neighborhood', 'name slug county')
    .sort({ featured: -1, 'stats.totalVisits': -1, createdAt: -1 })
    .limit(5)
    .lean();

  const ratingMap = await getRatingMap(businesses.map((business) => business._id));

  const matches = businesses.map((business) => {
    const relevance = [];

    if (matchedCategorySlugs.includes(business.category?.slug)) {
      relevance.push(`Matched category: ${business.category?.name}`);
    }

    if ((business.name || '').toLowerCase().includes(need.toLowerCase())) {
      relevance.push('Matched by business name');
    } else if ((business.description || '').toLowerCase().includes(need.toLowerCase())) {
      relevance.push('Matched by business description');
    }

    const rating = ratingMap.get(String(business._id));

    return {
      name: business.name,
      slug: business.slug,
      category: business.category?.name || '',
      neighborhood: business.neighborhood?.name || '',
      county: business.neighborhood?.county || '',
      description: safeSnippet(business.description, 180),
      rating: rating?.count ? `${rating.average.toFixed(1)} (${rating.count})` : 'No ratings yet',
      relevance: relevance.length ? relevance : ['Matched by location and popularity'],
      hometeamUrl: toBusinessUrl(business.slug),
    };
  });

  logUsage({
    tool: 'find_by_specialty',
    input,
    businessesReturned: businesses.map((business) => business._id),
    apiKey: requestMeta.apiKey || null,
    source: requestMeta.source || 'unknown',
    responseTimeMs: Date.now() - startedAt,
  });

  if (matches.length === 0) {
    return {
      matches: [],
      summary: 'No businesses found matching that need. Try a broader request or remove the location filter.',
      location: locationFilter.locationContext || null,
    };
  }

  return {
    matches,
    summary: `Found ${matches.length} matching businesses for "${need.trim()}".`,
    inferredCategories: matchedCategories.map((category) => ({
      name: category.name,
      slug: category.slug,
    })),
    location: locationFilter.locationContext || null,
  };
};
