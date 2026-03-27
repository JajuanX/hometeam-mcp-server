import mongoose from 'mongoose';

import Review from '../models/Review.js';

export const COUNTY_VALUES = ['Miami-Dade', 'Broward', 'Palm Beach'];

export const getBaseUrl = () => process.env.MCP_BASE_URL || 'https://hometeam.app';

export const toBusinessUrl = (slug) => `${getBaseUrl().replace(/\/$/, '')}/business/${slug}`;

export const toDraftClassUrl = (slug) => `${getBaseUrl().replace(/\/$/, '')}/draft-class/${slug}`;

export const safeSnippet = (text, maxLength = 200) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

export const normalizeLimit = (value, fallback = 10, max = 25) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
};

export const escapeRegex = (text) => {
  if (!text) {
    return '';
  }

  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const formatAddress = (address = {}) => {
  const parts = [address.street, address.city, address.state, address.zip]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);

  return parts.join(', ');
};

export const formatHours = (hours = []) => {
  if (!Array.isArray(hours)) {
    return [];
  }

  return hours.map((entry) => {
    if (!entry || !entry.day) {
      return null;
    }

    if (entry.closed) {
      return `${entry.day}: Closed`;
    }

    const openLabel = entry.open || 'N/A';
    const closeLabel = entry.close || 'N/A';
    return `${entry.day}: ${openLabel} - ${closeLabel}`;
  }).filter(Boolean);
};

export const toObjectIdArray = (values = []) => {
  return values
    .map((value) => {
      if (!value) {
        return null;
      }

      if (value instanceof mongoose.Types.ObjectId) {
        return value;
      }

      if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
        return new mongoose.Types.ObjectId(value);
      }

      if (typeof value === 'object' && value._id && mongoose.Types.ObjectId.isValid(value._id)) {
        return new mongoose.Types.ObjectId(value._id);
      }

      return null;
    })
    .filter(Boolean);
};

export const getRatingMap = async (businessIds = []) => {
  const objectIds = toObjectIdArray(businessIds);

  if (objectIds.length === 0) {
    return new Map();
  }

  const rows = await Review.aggregate([
    {
      $match: {
        business: { $in: objectIds },
      },
    },
    {
      $group: {
        _id: '$business',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  return new Map(rows.map((row) => [
    String(row._id),
    {
      average: Number(row.average?.toFixed(2) || 0),
      count: row.count || 0,
    },
  ]));
};

export const formatRatingLabel = (ratingEntry) => {
  if (!ratingEntry || !ratingEntry.count) {
    return 'No ratings yet';
  }

  return `${ratingEntry.average.toFixed(1)} (${ratingEntry.count} reviews)`;
};
