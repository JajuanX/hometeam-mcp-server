import mongoose from 'mongoose';

import Business from '../models/Business.js';
import Event from '../models/Event.js';
import Review from '../models/Review.js';
import logUsage from '../utils/logUsage.js';
import {
  escapeRegex,
  formatAddress,
  formatHours,
  getRatingMap,
  safeSnippet,
  toBusinessUrl,
} from './helpers.js';

export const getBusinessDetailsSchema = {
  description: 'Get detailed information about a specific Black-owned business on Hometeam, including hours, contact info, social media, reviews, and current specials.',
  inputSchema: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description: 'Business slug (URL-friendly name)',
      },
      name: {
        type: 'string',
        description: 'Business name (will fuzzy match if exact slug not known)',
      },
    },
  },
};

const getSocialMediaPayload = (socialMedia = {}) => {
  return Object.entries(socialMedia).reduce((accumulator, [key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      accumulator[key] = value.trim();
    }
    return accumulator;
  }, {});
};

const formatEventRow = (event) => ({
  id: String(event._id),
  type: event.type,
  title: event.title,
  description: safeSnippet(event.description, 250),
  startDate: event.startDate,
  endDate: event.endDate,
});

export const getBusinessDetailsHandler = async (input = {}, requestMeta = {}) => {
  const startedAt = Date.now();
  const { slug, name } = input;

  if (!slug && !name) {
    return {
      error: 'Either "slug" or "name" is required.',
    };
  }

  const query = { status: 'active' };

  if (slug) {
    query.slug = slug;
  } else if (name) {
    query.name = new RegExp(escapeRegex(name.trim()), 'i');
  }

  const business = await Business.findOne(query)
    .populate('category', 'name slug')
    .populate('neighborhood', 'name slug county')
    .populate('draftClass', 'label slug month year status');

  if (!business) {
    return {
      error: 'Business not found',
    };
  }

  const [ratingMap, recentReviews, activeEvents, communityVouches] = await Promise.all([
    getRatingMap([business._id]),
    Review.aggregate([
      {
        $match: {
          business: new mongoose.Types.ObjectId(business._id),
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      {
        $unwind: {
          path: '$userDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          rating: 1,
          text: 1,
          createdAt: 1,
          userName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$userDoc.firstName', 'Community'] },
                  ' ',
                  { $ifNull: ['$userDoc.lastName', 'Member'] },
                ],
              },
            },
          },
        },
      },
    ]),
    Event.find({
      business: business._id,
      isActive: true,
      $or: [
        { startDate: { $gte: new Date() } },
        { endDate: { $gte: new Date() } },
        { endDate: null },
      ],
    }).sort({ startDate: 1 }),
    mongoose.connection.collection('vouches').countDocuments({ business: business._id }),
  ]);

  const rating = ratingMap.get(String(business._id)) || { average: 0, count: 0 };

  Business.updateOne(
    { _id: business._id },
    { $inc: { 'stats.totalViews': 1 } },
  ).catch((error) => {
    console.error('Failed to increment business views:', error.message);
  });

  const currentSpecials = activeEvents.filter((event) => event.type === 'special').map(formatEventRow);
  const upcomingEvents = activeEvents.filter((event) => event.type === 'event').map(formatEventRow);

  logUsage({
    tool: 'get_business_details',
    input,
    businessesReturned: [business._id],
    apiKey: requestMeta.apiKey || null,
    source: requestMeta.source || 'unknown',
    responseTimeMs: Date.now() - startedAt,
  });

  return {
    name: business.name,
    slug: business.slug,
    description: business.description || '',
    category: business.category?.name || '',
    neighborhood: business.neighborhood?.name || '',
    county: business.neighborhood?.county || '',
    address: formatAddress(business.address),
    contact: {
      phone: business.contact?.phone || '',
      email: business.contact?.email || '',
      website: business.contact?.website || '',
    },
    socialMedia: getSocialMediaPayload(business.socialMedia),
    hours: formatHours(business.hours),
    rating: {
      average: Number(rating.average?.toFixed?.(2) || 0),
      count: rating.count || 0,
    },
    reviews: recentReviews.map((review) => ({
      user: review.userName,
      rating: review.rating,
      text: safeSnippet(review.text, 300),
      createdAt: review.createdAt,
    })),
    currentSpecials,
    upcomingEvents,
    stats: {
      totalVisits: business.stats?.totalVisits || 0,
      communityVouches,
    },
    draftClass: business.draftClass?.label || null,
    hometeamUrl: toBusinessUrl(business.slug),
    verifiedBusiness: true,
  };
};
