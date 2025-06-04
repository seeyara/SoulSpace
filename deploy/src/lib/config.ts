export const config = {
  openai: {
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  },
  // Add other configuration values here as needed
};

// Validate required environment variables
const requiredEnvVars = ['NEXT_PUBLIC_OPENAI_API_KEY'];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} is not set in environment variables`);
  }
}); 