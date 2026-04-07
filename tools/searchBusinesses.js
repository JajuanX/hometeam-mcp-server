import Business from '../models/Business.js';
import Category from '../models/Category.js';
import Neighborhood from '../models/Neighborhood.js';
import logUsage from '../utils/logUsage.js';
import {
  COUNTY_VALUES,
  escapeRegex,
  formatRatingLabel,
  getRatingMap,
  normalizeLimit,
  safeSnippet,
  toBusinessUrl,
} from './helpers.js';

const SORT_MAP = {
  newest: { createdAt: -1 },
  name: { name: 1 },
  most_visited: { 'stats.totalVisits': -1, featured: -1 },
};

const EMPTY_DIRECTORY_MESSAGE = 'No businesses found yet. Hometeam is a new platform - businesses are added monthly on Draft Day. Check back soon!';

export const searchBusinessesSchema = {
  description: 'Search the Hometeam directory for Black-owned businesses in South Florida. Filter by category, neighborhood, county, or keyword search. Returns active, verified businesses only.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search term to find businesses by name or description',
      },
      category: {
        type: 'string',
        description: 'Category slug to filter by (e.g., restaurants-food, hair-beauty, professional-services)',
      },
      neighborhood: {
        type: 'string',
        description: 'Neighborhood slug to filter by (e.g., lauderhill, overtown, miramar)',
      },
      county: {
        type: 'string',
        enum: COUNTY_VALUES,
        description: 'County to filter by',
      },
      limit: {
        type: 'number',
        description: 'Number of results to return (default 10, max 25)',
      },
      sort: {
        type: 'string',
        enum: ['newest', 'name', 'most_visited', 'highest_rated'],
        description: 'Sort order (default: most_visited)',
      },
    },
  },
};

const buildEmptyResponse = (querySummary) => ({
  results: [],
  total: 0,
  query_summary: querySummary || EMPTY_DIRECTORY_MESSAGE,
});

export const searchBusinessesHandler = async (input = {}, requestMeta = {}) => {
  const startedAt = Date.now();
  const {
    query,
    category,
    neighborhood,
    county,
    sort = 'most_visited',
  } = input;
  const limit = normalizeLimit(input.limit, 10, 25);

  const mongoQuery = { status: 'active' };

  if (query && query.trim()) {
    const regex = new RegExp(escapeRegex(query.trim()), 'i');
    mongoQuery.$or = [{ name: regex }, { description: regex }];
  }

  if (category) {
    const matchedCategory = await Category.findOne({ slug: category }).select('_id');

    if (!matchedCategory) {
      return buildEmptyResponse(`No businesses found for category "${category}". ${EMPTY_DIRECTORY_MESSAGE}`);
    }

    mongoQuery.category = matchedCategory._id;
  }

  if (neighborhood) {
    const matchedNeighborhood = await Neighborhood.findOne({ slug: neighborhood }).select('_id');

    if (!matchedNeighborhood) {
      return buildEmptyResponse(`No businesses found in neighborhood "${neighborhood}". ${EMPTY_DIRECTORY_MESSAGE}`);
    }

    mongoQuery.neighborhood = matchedNeighborhood._id;
  }

  if (county) {
    const countyNeighborhoods = await Neighborhood.find({ county }).select('_id');
    const neighborhoodIds = countyNeighborhoods.map((item) => item._id);

    if (neighborhoodIds.length === 0) {
      return buildEmptyResponse(`No businesses found in ${county}. ${EMPTY_DIRECTORY_MESSAGE}`);
    }

    if (mongoQuery.neighborhood) {
      const selectedId = String(mongoQuery.neighborhood);
      if (!neighborhoodIds.some((item) => String(item) === selectedId)) {
        return buildEmptyResponse(`No businesses found in ${county} for that neighborhood filter. ${EMPTY_DIRECTORY_MESSAGE}`);
      }
    } else {
      mongoQuery.neighborhood = { $in: neighborhoodIds };
    }
  }

  const total = await Business.countDocuments(mongoQuery);

  if (total === 0) {
    const emptyResult = buildEmptyResponse(EMPTY_DIRECTORY_MESSAGE);
    logUsage({
      tool: 'search_businesses',
      input,
      businessesReturned: [],
      apiKey: requestMeta.apiKey || null,
      source: requestMeta.source || 'unknown',
      responseTimeMs: Date.now() - startedAt,
    });
    return emptyResult;
  }

  const businesses = await Business.find(mongoQuery)
    .populate('category', 'name slug')
    .populate('neighborhood', 'name slug county')
    .sort(sort === 'highest_rated' ? SORT_MAP.most_visited : (SORT_MAP[sort] || SORT_MAP.most_visited))
    .limit(sort === 'highest_rated' ? Math.max(limit * 3, 50) : limit)
    .lean();

  const ratingMap = await getRatingMap(businesses.map((business) => business._id));

  const sortedBusinesses = [...businesses];
  if (sort === 'highest_rated') {
    sortedBusinesses.sort((left, right) => {
      const leftRating = ratingMap.get(String(left._id))?.average || 0;
      const rightRating = ratingMap.get(String(right._id))?.average || 0;

      if (rightRating !== leftRating) {
        return rightRating - leftRating;
      }

      return (right.stats?.totalVisits || 0) - (left.stats?.totalVisits || 0);
    });
  }

  const selectedBusinesses = sortedBusinesses.slice(0, limit);

  const results = selectedBusinesses.map((business) => {
    const ratingEntry = ratingMap.get(String(business._id));

    return {
      name: business.name,
      slug: business.slug,
      category: business.category?.name || 'Unknown',
      neighborhood: business.neighborhood?.name || 'Unknown',
      county: business.neighborhood?.county || 'Unknown',
      description: safeSnippet(business.description, 200),
      rating: formatRatingLabel(ratingEntry),
      totalVisits: business.stats?.totalVisits || 0,
      featured: Boolean(business.featured),
      contact: {
        phone: business.contact?.phone || '',
        website: business.contact?.website || '',
      },
      hometeamUrl: toBusinessUrl(business.slug),
    };
  });

  logUsage({
    tool: 'search_businesses',
    input,
    businessesReturned: selectedBusinesses.map((business) => business._id),
    apiKey: requestMeta.apiKey || null,
    source: requestMeta.source || 'unknown',
    responseTimeMs: Date.now() - startedAt,
  });

  return {
    results,
    total,
    query_summary: `Found ${total} Black-owned businesses matching your search.`,
  };
};
