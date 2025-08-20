import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({
    apiKey: process.env.GEMINI_API_KEY
    // To use environment variables, set GEMINI_API_KEY in your .env.local file
  })],
});
