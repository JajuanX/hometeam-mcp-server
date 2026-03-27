import Neighborhood from '../models/Neighborhood.js';
import logUsage from '../utils/logUsage.js';
import { COUNTY_VALUES } from './helpers.js';

export const listNeighborhoodsSchema = {
  description: 'List all South Florida neighborhoods in the Hometeam directory, organized by county (Miami-Dade, Broward, Palm Beach).',
  inputSchema: {
    type: 'object',
    properties: {
      county: {
        type: 'string',
        enum: COUNTY_VALUES,
        description: 'Filter by county',
      },
    },
  },
};

export const listNeighborhoodsHandler = async (input = {}, requestMeta = {}) => {
  const startedAt = Date.now();
  const { county } = input;
  const query = county ? { county } : {};

  const neighborhoods = await Neighborhood.find(query).sort({ county: 1, name: 1 }).lean();

  const grouped = neighborhoods.reduce((accumulator, neighborhood) => {
    if (!accumulator[neighborhood.county]) {
      accumulator[neighborhood.county] = [];
    }

    accumulator[neighborhood.county].push({
      name: neighborhood.name,
      slug: neighborhood.slug,
    });

    return accumulator;
  }, {});

  logUsage({
    tool: 'list_neighborhoods',
    input,
    businessesReturned: [],
    apiKey: requestMeta.apiKey || null,
    source: requestMeta.source || 'unknown',
    responseTimeMs: Date.now() - startedAt,
  });

  return {
    neighborhoodsByCounty: Object.entries(grouped).map(([countyName, countyNeighborhoods]) => ({
      county: countyName,
      neighborhoods: countyNeighborhoods,
    })),
    total: neighborhoods.length,
  };
};
