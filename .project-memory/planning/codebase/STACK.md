# Technology Stack

**Analysis Date:** 2026-03-23

## Languages

**Primary:**
- TypeScript 5+ - All application code, strict type safety
- JavaScript - Configuration files and legacy components

**Secondary:**
- JSON - Database files and configuration
- Markdown - Documentation and content templates

## Runtime

**Environment:**
- Node.js (implied by Next.js 16.1.6)
- Next.js React 19.2.3 runtime

**Package Manager:**
- npm - Lock file present (package-lock.json)
- Lockfile: Present and committed

## Frameworks

**Core:**
- Next.js 16.1.6 - App Router with API routes
- React 19.2.3 - UI library with modern features
- React DOM 19.2.3 - DOM rendering

**Testing:**
- Jest 30.2.0 - Primary test runner
- ts-jest 29.4.6 - TypeScript compilation for tests
- @jest/globals 30.2.0 - Jest global utilities

**Build/Dev:**
- TypeScript 5+ - Type checking and compilation
- ESLint 9+ - Code linting with Next.js config
- Tailwind CSS 4+ - Utility-first styling

## Key Dependencies

**Critical:**
- dotenv 17.2.4 - Environment variable management
- clsx 2.1.1 + tailwind-merge 3.4.0 - CSS class management
- class-variance-authority 0.7.1 - Component variant system

**Infrastructure:**
- node-fetch 3.3.2 - HTTP client for external APIs
- Vercel 50.13.2 - Deployment and serverless functions

**UI Components:**
- @radix-ui/react-progress 1.1.8 - Accessible progress bars
- @radix-ui/react-tabs 1.1.13 - Tab component primitives
- @tanstack/react-table 8.21.3 - Data table functionality
- lucide-react 0.563.0 - Icon library
- framer-motion 12.34.0 - Animation library
- recharts 3.7.0 - Chart visualization
- next-themes 0.4.6 - Theme management

## Configuration

**Environment:**
- Multiple credential sources (WORDPRESS_*, SLACK_*, etc.)
- Development/production environment detection
- Vercel deployment configuration in vercel.json

**Build:**
- Next.js config with webpack customization
- Jest configuration for TypeScript and path mapping
- ESLint with Next.js rules

## Platform Requirements

**Development:**
- Node.js compatible environment
- Environment variables for external services
- File system access for JSON database

**Production:**
- Vercel serverless platform
- Read-only filesystem handling
- Cron job scheduling capability

---

*Stack analysis: 2026-03-23*