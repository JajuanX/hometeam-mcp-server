const usageByIdentity = new Map();

const getCurrentDayKey = () => new Date().toISOString().slice(0, 10);

const getAllowlistedKeys = () => {
  const configured = process.env.MCP_API_KEYS || '';
  return configured
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
};

const getDailyLimit = (tier) => {
  if (tier === 'paid') {
    return Number(process.env.MCP_PAID_DAILY_LIMIT || 30000);
  }

  return Number(process.env.MCP_FREE_DAILY_LIMIT || 100);
};

const getIdentityKey = ({ apiKey, ip }) => {
  if (apiKey) {
    return `key:${apiKey}`;
  }

  return `ip:${ip || 'unknown'}`;
};

export const apiKeyAuth = (req, res, next) => {
  const headerKey = req.header('x-api-key') || null;
  const allowlistedKeys = getAllowlistedKeys();
  const isPaid = Boolean(headerKey && allowlistedKeys.includes(headerKey));
  const tier = isPaid ? 'paid' : 'free';
  const identity = getIdentityKey({ apiKey: isPaid ? headerKey : null, ip: req.ip });
  const dayKey = getCurrentDayKey();
  const dailyLimit = getDailyLimit(tier);

  const existing = usageByIdentity.get(identity);

  if (!existing || existing.day !== dayKey) {
    usageByIdentity.set(identity, { count: 0, day: dayKey });
  }

  const usage = usageByIdentity.get(identity);

  if (usage.count >= dailyLimit) {
    return res.status(429).json({
      success: false,
      message: `Rate limit reached for ${tier} tier (${dailyLimit} requests/day).`,
    });
  }

  usage.count += 1;

  req.mcpAccess = {
    apiKey: isPaid ? headerKey : null,
    identity,
    tier,
    usageCount: usage.count,
    dailyLimit,
  };

  return next();
};

export default apiKeyAuth;
