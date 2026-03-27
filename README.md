# Designer Homes Real Estate Services — Platform

A comprehensive real estate appraisal and management platform combining a public-facing website with an internal appraisal application and administrative dashboard.

## Overview

This platform serves Designer Homes Real Estate Services with:
- **Public Website**: Client-facing site with service information, quote requests, FAQ, and company details
- **Internal App**: Secure appraisal platform for managing property valuations and client interactions
- **Admin Dashboard**: Administrative interface for platform management and data oversight

## Architecture

**Technology Stack:**
- Static HTML/CSS/JavaScript (no build process required)
- Netlify hosting with automatic deployments
- localStorage-based MVP for client-side data persistence
- Future integration: Supabase for backend database

**Key Features:**
- Security headers (CSP, X-Frame-Options, etc.) configured via netlify.toml
- SEO optimization (sitemap.xml, robots.txt)
- Protected routes for internal app and admin sections
- Responsive design with public and admin CSS
- API integration ready (OpenAI, Anthropic, Supabase)

## Project Structure

```
Designer Homes website/
├── index.html                    # Homepage
├── about.html                    # Company information
├── services.html                 # Service offerings
├── contact.html                  # Contact form
├── quote.html                    # Quote request form
├── faq.html                      # Frequently asked questions
├── reviews.html                  # Client testimonials
├── service-area.html             # Service area information
├── lender-inquiry.html           # Lender inquiry form
├── mass-appraisal.html          # Mass appraisal information
├── portal.html                   # Client portal landing
├── admin.html                    # Admin dashboard
│
├── /app/                         # Internal appraisal platform
│   ├── index.html               # App entry point
│   ├── css/
│   │   └── app.css              # App styling
│   └── js/                       # 8 JavaScript modules
│
├── /css/
│   ├── styles.css               # Public site styles
│   └── admin.css                # Admin styles
│
├── /js/
│   ├── admin-core.js            # Admin core functionality
│   └── admin-modules.js         # Admin module management
│
├── netlify.toml                 # Netlify build & deployment config
├── _redirects                   # Netlify redirect rules
├── robots.txt                   # SEO robots configuration
├── sitemap.xml                  # XML sitemap for search engines
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

## Deployment Instructions

### Prerequisites
- GitHub account with repository access
- Netlify account (free tier supported)
- Git installed locally

### GitHub Setup
1. Initialize a git repository in the project root:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Designer Homes platform"
   ```

2. Create a new repository on GitHub and push:
   ```bash
   git remote add origin https://github.com/your-username/designer-homes.git
   git branch -M main
   git push -u origin main
   ```

### Netlify Deployment
1. Log in to [Netlify](https://app.netlify.com)
2. Click "New site from Git"
3. Connect your GitHub repository
4. Netlify will automatically detect `netlify.toml`
5. Configure environment variables (see below)
6. Click "Deploy"

**Build Settings (Auto-detected):**
- Publish directory: `.` (root directory)
- Build command: (none required)

### Environment Variables
Set these in Netlify Site Settings → Build & Deploy → Environment:

```
# Future Supabase Integration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# API Integration
OPENAI_API_KEY=sk-...          # For ChatGPT integration
ANTHROPIC_API_KEY=sk-ant-...   # For Claude integration
```

## Security Notes

### Security Headers
The `netlify.toml` file configures the following security headers:
- **X-Frame-Options: DENY** — Prevents clickjacking attacks
- **X-Content-Type-Options: nosniff** — Prevents MIME type sniffing
- **X-XSS-Protection** — Legacy XSS protection (1; mode=block)
- **Referrer-Policy: strict-origin-when-cross-origin** — Limits referrer information
- **Content-Security-Policy** — Restricts resource loading to trusted sources
- **Permissions-Policy** — Disables camera, microphone, and geolocation

### Protected Routes
- `/app/` — Marked as no-index; requires authentication when integrated
- `/admin.html` — Marked as no-index; requires authentication when integrated
- `robots.txt` — Explicitly disallows indexing of internal sections

### API Integration
The CSP allows connections to:
- OpenAI API (`https://api.openai.com`)
- Anthropic API (`https://api.anthropic.com`)
- Supabase (`https://*.supabase.co`)

**Store API keys only in Netlify environment variables, never in code.**

## Development Workflow

### Local Testing
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/designer-homes.git
   cd designer-homes
   ```

2. Serve locally (requires a local server):
   ```bash
   python3 -m http.server 8000
   # or
   npx serve
   ```

3. Access at `http://localhost:8000`

### Making Changes
1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes and test locally
3. Commit and push:
   ```bash
   git add .
   git commit -m "Descriptive commit message"
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request on GitHub
5. Merge to `main` branch to trigger Netlify deployment

## Future Enhancements

- **Authentication**: Add Supabase Auth for client and admin access
- **Database**: Implement Supabase PostgreSQL for persistent data storage
- **API Functions**: Build serverless functions for backend logic
- **Email**: Configure transactional email via SendGrid or similar
- **Analytics**: Integrate analytics tracking for user behavior
- **Mobile**: Progressive Web App (PWA) capabilities

## License

Proprietary. All rights reserved. Unauthorized copying or distribution is prohibited.

---

**For support or questions, contact the development team.**
