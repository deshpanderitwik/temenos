# Temenos

Temenos is a sacred container for Jungian healing work, powered by advanced language models. The application provides a space for deep psychological exploration and healing through the lens of analytical psychology.

## Features

- AI-powered Jungian therapeutic interactions
- Secure and private conversation handling
- Context-aware responses
- Modern, intuitive interface (coming soon)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following content:
   ```
   PERPLEXITY_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

### POST /api/healing

Accepts JSON payload:
```json
{
  "prompt": "Your message or question",
  "context": "Optional additional context"
}
```

Returns:
```json
{
  "response": "AI-generated therapeutic response"
}
```

## Technology Stack

- Next.js
- TypeScript
- Tailwind CSS
- Perplexity API

## Security Note

Make sure to never commit your `.env.local` file or expose your API keys. The `.gitignore` file is configured to exclude sensitive files.
# Test commit
