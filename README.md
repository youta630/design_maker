# Design Spec Generator

AI-powered tool to generate detailed UI specifications from design images using Google Gemini AI.

🔗 **Repository**: [https://github.com/youta630/design_maker](https://github.com/youta630/design_maker)

## Features

- 📷 Image upload with drag & drop support
- 🤖 AI-powered design analysis using Gemini 2.5 Flash
- 📝 Structured Markdown specification output
- 📱 Responsive design for mobile and desktop
- 🛡️ Built-in security headers and validation
- ⚡ Optimized performance with Next.js

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/youta630/design_maker.git
   cd design_maker/design-spec-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your Gemini API key to `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Getting Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env.local` file

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `GEMINI_API_KEY`
3. Deploy automatically on push

### Other Platforms

Ensure the following environment variables are set:
- `GEMINI_API_KEY` (required)
- `NODE_ENV=production`

## Architecture

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **AI Integration**: Google Gemini 2.5 Flash API
- **File Processing**: Native FormData with validation
- **Deployment**: Optimized for Vercel with security headers

## Usage

1. Upload a UI design image (PNG, JPG, WebP, GIF)
2. Wait for AI analysis (typically 5-15 seconds)
3. Review generated specification document
4. Copy or share the Markdown output with your team

## Supported File Types

- PNG, JPG, JPEG, WebP, GIF
- Maximum file size: 10MB
- Recommended: High-resolution UI screenshots or design mockups

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## Security

- Environment variables are validated on startup
- File type and size validation
- Security headers (CSP, XSS protection, etc.)
- No client-side API key exposure

## Performance & Cost

- **Model**: Gemini 2.5 Flash for fast, cost-effective analysis
- **Pricing**: ~75% cheaper than Gemini 1.5 Pro
- **Rate Limits**: Built-in rate limiting (8 requests/minute)
- Image optimization with Next.js
- Bundle size optimization
- Responsive design for all devices
- Structured logging for monitoring

## License

MIT License - see LICENSE file for details