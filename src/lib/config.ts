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

// Client-side validation
requiredClientEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required client environment variable: ${envVar}`);
  }
}); 