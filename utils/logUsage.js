import mongoose from 'mongoose';

import McpUsage from '../models/McpUsage.js';

const redactSensitiveKeys = ['password', 'token', 'authorization', 'apiKey'];

const sanitizeValue = (value, depth = 0) => {
  if (depth > 5) {
    return '[max-depth]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      if (redactSensitiveKeys.includes(key)) {
        accumulator[key] = '[redacted]';
      } else {
        accumulator[key] = sanitizeValue(nestedValue, depth + 1);
      }
      return accumulator;
    }, {});
  }

  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}...`;
  }

  return value;
};

const normalizeBusinessIds = (businessesReturned = []) => {
  return businessesReturned
    .map((entry) => {
      if (!entry) {
        return null;
      }

      if (entry instanceof mongoose.Types.ObjectId) {
        return entry;
      }

      if (typeof entry === 'object' && entry._id) {
        return new mongoose.Types.ObjectId(entry._id);
      }

      if (typeof entry === 'string' && mongoose.Types.ObjectId.isValid(entry)) {
        return new mongoose.Types.ObjectId(entry);
      }

      return null;
    })
    .filter(Boolean);
};

export const logUsage = async ({
  tool,
  input,
  businessesReturned,
  apiKey = null,
  source = 'unknown',
  responseTimeMs = 0,
} = {}) => {
  if (!tool) {
    return;
  }

  try {
    await McpUsage.create({
      tool,
      input: sanitizeValue(input || {}),
      businessesReturned: normalizeBusinessIds(businessesReturned),
      apiKey,
      source,
      responseTimeMs,
    });
  } catch (error) {
    console.error('Failed to log MCP usage:', error.message);
  }
};

export default logUsage;
