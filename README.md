# Xero Quote Maker

Create Xero quotes using Claude Code with simple verbal descriptions.

## Overview

This project provides a Claude Code skill that allows you to create quotes in Xero by simply describing them in natural language. Claude will parse your description, structure the data, and create the quote via Xero's API.

**Example usage:**
> "Create a Xero quote for Acme Corp: 10 consulting hours at $150/hour, 5 hours travel at $75/hour"

Claude will automatically:
- Parse the quote details
- Look up or create the contact
- Create the quote in Xero
- Return the quote number and URL

## Setup Instructions

### Prerequisites

1. **Xero Account** - Free account at [xero.com](https://xero.com)
2. **Xero Developer App** - Register at [developer.xero.com](https://developer.xero.com)
3. **Node.js** - Version 18 or higher
4. **Claude Code** - Latest version

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Xero API Credentials

1. Go to [https://developer.xero.com/app/manage](https://developer.xero.com/app/manage)
2. Create a new app:
   - **Integration type:** Web app
   - **App name:** Xero Quote Maker (or your choice)
   - **Redirect URI:** `http://localhost:3000/callback`
3. Save your **Client ID** and **Client Secret**

### 3. Set Up Environment Variables

Copy the example env file and add your credentials:

```bash
cp .env.example .env
```

Edit `.env` and add:
```
XERO_CLIENT_ID=your_client_id_here
XERO_CLIENT_SECRET=your_client_secret_here
XERO_REDIRECT_URI=http://localhost:3000/callback
```

### 4. Complete OAuth Authorization

Run the OAuth helper to authorize the app:

```bash
npm run auth
```

This will:
1. Open a browser window to Xero's authorization page
2. Ask you to log in and authorize the app
3. Save your access tokens to `credentials.json`
4. Display your Xero Tenant ID

Add the Tenant ID to your `.env` file:
```
XERO_TENANT_ID=your_tenant_id_here
```

### 5. Test the Setup

Run the test script to verify everything works:

```bash
npm test
```

This will create a sample quote in your Xero account. Check your Xero dashboard to see it!

**You're ready!** Now you can create quotes by simply talking to Claude.

## Usage with Claude Code

### Invoking the Skill

Simply tell Claude to create a Xero quote:

```
Create a Xero quote for [customer name]: [items with quantities and prices]
```

### Examples

**Basic quote:**
```
Create a Xero quote for ABC Ltd: 10 widgets at $50 each
```

**Multiple items:**
```
Create a quote for Tech Solutions:
- Website design: $2500
- Hosting setup: $250
- 5 hours training at $100/hour
```

**With additional details:**
```
Create a Xero quote for Sarah's Bakery (email: hello@sarahsbakery.com):
- Custom website: $3500
- Logo design: $500
Reference: PROJECT-2025-001
```

**From conversation:**
```
I need to quote a client for consulting work. It's for Acme Corp,
20 hours at $95 per hour plus 5 hours travel time at $50 per hour.
```

### What Claude Will Do

1. **Parse** your description to extract:
   - Contact name and email (optional)
   - Line items with descriptions, quantities, and prices
   - Reference numbers (optional)
   - Terms and conditions (optional)

2. **Validate** the data to ensure all required fields are present

3. **Show summary** for your confirmation (unless you say "create immediately")

4. **Create in Xero** using the API

5. **Return results** with quote number and Xero URL

### Quote Format

The skill understands various input formats:

- **Quantities:** "10", "2.5", "1/2"
- **Prices:** "$50", "$100", "25.99", "1,500"
- **Descriptions:** Any text
- **Dates:** "2025-11-06" or defaults to today

## Project Structure

```
xero-maker/
├── .claude/
│   └── skills/
│       └── xero-quote/
│           ├── skill.md                  # Skill instructions for Claude
│           └── lib/
│               ├── xero-client.ts        # Xero API wrapper
│               └── quote-mapper.ts       # Data parsing/validation
├── lib/
│   ├── oauth-helper.ts                   # OAuth setup script
│   └── test-quote.ts                     # Test script
├── .env                                  # Your credentials (gitignored)
├── .env.example                          # Template
├── credentials.json                      # OAuth tokens (gitignored)
├── package.json
└── tsconfig.json
```

## How It Works

The skill uses:
- **XeroService** - Handles OAuth, API calls, and quote creation
- **Quote Mapper** - Parses natural language input and validates data
- **OAuth Helper** - One-time setup script for authentication

For technical details, see the code in `.claude/skills/xero-quote/lib/`

## Troubleshooting

- **Authentication issues:** Run `npm run auth` to re-authorize
- **Quotes not appearing:** Check Xero → Sales → Quotes (they're created as DRAFT)
- **Token errors:** Tokens refresh automatically; if it fails, run `npm run auth`

## Notes

- Credentials are gitignored - never commit `.env` or `credentials.json`
- Tokens auto-refresh every 30 minutes; re-auth needed every 60 days
- Quotes created as DRAFT (Xero API limitation)
- Requires Standard or Adviser Xero permissions

## License

MIT
