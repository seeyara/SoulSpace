// Server-side configuration - DO NOT expose to client
export const serverConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
};

// Client-side configuration - safe to expose
export const clientConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    envPrefix: process.env.NEXT_PUBLIC_SUPABASE_ENV_PREFIX || '',
  },
  analytics: {
    gaTrackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID || '',
  },
  openai: {
    completionModel: process.env.NEXT_PUBLIC_OPENAI_COMPLETION_MODEL || 'gpt-4',
  },
};

// Unified environment configuration for Sentry and other services
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  supabase: clientConfig.supabase,
  analytics: clientConfig.analytics,
  openai: {
    ...serverConfig.openai,
    ...clientConfig.openai,
  },
};

// Validate required environment variables on server
const requiredServerEnvVars = ['OPENAI_API_KEY'];
const requiredClientEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

// Server-side validation (only runs on server)
if (typeof window === 'undefined') {
  requiredServerEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      throw new Error(`Missing required server environment variable: ${envVar}`);
    }
  });
}

// Client-side validation (only validate on server at build time)
if (typeof window === 'undefined') {
  requiredClientEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      throw new Error(`Missing required client environment variable: ${envVar}`);
    }
  });
} 