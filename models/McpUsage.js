import mongoose from 'mongoose';

const mcpUsageSchema = new mongoose.Schema({
  tool: {
    type: String,
    required: [true, 'Tool name is required'],
    trim: true,
  },
  input: {
    type: Object,
    default: {},
  },
  businessesReturned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
  }],
  apiKey: {
    type: String,
    default: null,
  },
  source: {
    type: String,
    default: 'unknown',
  },
  responseTimeMs: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'mcpusages',
});

mcpUsageSchema.index({ createdAt: -1 });
mcpUsageSchema.index({ businessesReturned: 1, createdAt: -1 });

const McpUsage = mongoose.models.McpUsage || mongoose.model('McpUsage', mcpUsageSchema);

export default McpUsage;
