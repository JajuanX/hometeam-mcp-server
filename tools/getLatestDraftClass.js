import Business from '../models/Business.js';
import DraftClass from '../models/DraftClass.js';
import logUsage from '../utils/logUsage.js';
import { safeSnippet, toBusinessUrl, toDraftClassUrl } from './helpers.js';

export const getLatestDraftClassSchema = {
  description: 'Get the most recent Draft Class — the newest businesses to join Hometeam. Draft Day is a monthly event where new businesses are officially added to the directory.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const getLatestDraftClassHandler = async (input = {}, requestMeta = {}) => {
  const startedAt = Date.now();

  const latestDraftClass = await DraftClass.findOne({ status: 'published' })
    .sort({ publishedAt: -1, year: -1, month: -1 })
    .lean();

  if (!latestDraftClass) {
    logUsage({
      tool: 'get_latest_draft_class',
      input,
      businessesReturned: [],
      apiKey: requestMeta.apiKey || null,
      source: requestMeta.source || 'unknown',
      responseTimeMs: Date.now() - startedAt,
    });

    return {
      message: 'No published Draft Class yet.',
      draftClass: null,
      businesses: [],
    };
  }

  const businesses = await Business.find({
    draftClass: latestDraftClass._id,
    status: 'active',
  })
    .populate('category', 'name slug')
    .populate('neighborhood', 'name slug county')
    .sort({ featured: -1, name: 1 })
    .lean();

  logUsage({
    tool: 'get_latest_draft_class',
    input,
    businessesReturned: businesses.map((business) => business._id),
    apiKey: requestMeta.apiKey || null,
    source: requestMeta.source || 'unknown',
    responseTimeMs: Date.now() - startedAt,
  });

  return {
    draftClass: {
      label: latestDraftClass.label,
      slug: latestDraftClass.slug,
      publishedAt: latestDraftClass.publishedAt,
      scheduledDate: latestDraftClass.scheduledDate,
      businessCount: businesses.length,
      showcaseUrl: toDraftClassUrl(latestDraftClass.slug),
    },
    businesses: businesses.map((business) => ({
      id: String(business._id),
      name: business.name,
      slug: business.slug,
      category: business.category?.name || '',
      neighborhood: business.neighborhood?.name || '',
      county: business.neighborhood?.county || '',
      description: safeSnippet(business.description, 180),
      hometeamUrl: toBusinessUrl(business.slug),
    })),
  };
};
