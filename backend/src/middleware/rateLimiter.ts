import { rateLimit } from 'express-rate-limit';

/**
 * Global Rate Limiter
 * Protects all general API endpoints from excessive requests.
 * Allows up to 30000 requests per 15 minutes per IP (NAT friendly).
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30000,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the legacy `X-RateLimit-*` headers
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

/**
 * Auth-Specific Rate Limiter
 * Used for authentication endpoints (login, register, refresh-token).
 * Configured with a high threshold (5000 requests per 15 minutes) to support 
 * 500+ concurrent student logins at a time from the same college NAT gateway.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many login attempts from this network. Please try again after 15 minutes.',
  },
});
