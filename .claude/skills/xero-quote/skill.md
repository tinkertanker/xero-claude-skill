---
name: xero-quote
description: Create quotes in Xero from verbal descriptions or structured data
tags: [xero, accounting, quotes, invoicing]
---

# Xero Quote Creation Skill

This skill enables you to create quotes in Xero from verbal descriptions provided by the user.

## Prerequisites

Before using this skill, ensure:
1. OAuth authentication is complete (credentials.json exists)
2. Environment variables are set in .env (XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_TENANT_ID)
3. Dependencies are installed (npm install)

## Workflow

When the user requests a Xero quote creation, follow these steps:

### 1. Parse User Input

Extract the following information from the user's verbal description:

**Required:**
- **Contact name**: The customer/client name (e.g., "Acme Corp", "John Smith")
- **Line items**: Each item should have:
  - Description (e.g., "Website design", "Consulting hours")
  - Quantity (numeric, can be decimal like 2.5)
  - Unit amount/price (numeric, in pounds)

**Optional:**
- Contact email address
- Reference number
- Terms and conditions
- Quote date (defaults to today if not specified)

**Example verbal inputs:**
- "Create a quote for Acme Corp: 10 widgets at £50 each, 5 gadgets at £100 each"
- "Quote for Sarah's Bakery: web design £2500, hosting setup £150"
- "New quote for Tech Solutions Ltd with email hello@techsolutions.com: 20 hours consulting at £95/hour, reference PROJECT-123"

### 2. Structure the Data

Create a TypeScript file that imports the necessary modules and structures the data:

```typescript
import { XeroService } from './.claude/skills/xero-quote/lib/xero-client.js';
import { validateQuoteData, toQuoteData, formatQuoteSummary } from './.claude/skills/xero-quote/lib/quote-mapper.js';

const quoteInput = {
  contactName: "Customer Name",
  contactEmail: "optional@email.com", // optional
  lineItems: [
    {
      description: "Item description",
      quantity: 1,
      unitAmount: 100.00
    }
  ],
  reference: "REF-123", // optional
  date: "2025-11-06" // optional, YYYY-MM-DD format
};
```

### 3. Validate the Data

Use the validation utility to check the data:

```typescript
const validation = validateQuoteData(quoteInput);

if (!validation.valid) {
  console.error('Validation errors:');
  validation.errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}
```

If validation fails, inform the user about missing or invalid information and ask for clarification.

### 4. Display Summary for Confirmation

Show the user a formatted summary:

```typescript
console.log('\n=== Quote Summary ===\n');
console.log(formatQuoteSummary(quoteInput));
console.log('\n');
```

Ask the user to confirm before proceeding (unless they explicitly said to create it immediately).

### 5. Create the Quote

Initialize the Xero service and create the quote:

```typescript
const xeroService = new XeroService();

try {
  await xeroService.initialize();

  const quoteData = toQuoteData(quoteInput);
  const result = await xeroService.createQuote(quoteData);

  console.log('\n✓ Quote created successfully!\n');
  console.log(`Quote Number: ${result.quoteNumber}`);
  console.log(`Quote ID: ${result.quoteID}`);
  console.log(`View in Xero: ${result.url}`);
} catch (error) {
  console.error('Failed to create quote:', error);
  process.exit(1);
}
```

### 6. Handle Results

**Success:**
- Inform the user the quote was created
- **ALWAYS provide the clickable Xero URL link** so the user can click directly to view the quote
- Provide the quote number and Quote ID
- Note that the quote is created as DRAFT status in Xero
- Explain they can edit or mark it as SENT in Xero

**When creating multiple quotes:**
- Display a summary table with all quote numbers and links
- Make each link clickable for easy access
- Show the customer name and attention/reference details

**Failure:**
- If contact not found, the system will create it automatically
- If API errors occur, show the error message
- If token refresh fails, instruct user to run `npm run auth` again

## Error Handling

Common errors and solutions:

| Error | Solution |
|-------|----------|
| "Failed to initialize Xero client" | Run `npm run auth` to set up OAuth |
| "Contact name is required" | Ask user to specify the customer/client name |
| "At least one line item is required" | Ask user what products/services to include |
| "Invalid currency format" | Ensure prices are numeric (e.g., 50, 100.50) |
| "Failed to refresh token" | Re-authorize with `npm run auth` |

## Tips for Natural Language Processing

When parsing user input:

1. **Currency amounts**: Accept "$50", "100", "25.99", "1,500" - strip symbols and commas
   - **IMPORTANT: All prices should be in dollars ($), NOT pounds (£)**
   - Display amounts with $ symbol (e.g., $1,850.00, not £1,850.00)
2. **Quantities**: Accept "10", "2.5", "1/2" (as 0.5)
3. **Contact lookup**: System will search existing contacts or create new ones
4. **Multiple items**: Parse lists, comma-separated, or numbered items
5. **Implied information**: Default to today's date if not specified

## Example Complete Workflow

User says: *"Create a Xero quote for Acme Ltd: 5 hours consulting at $150/hour, 2 hours travel at $75/hour"*

1. Parse:
   - Contact: "Acme Ltd"
   - Item 1: "Consulting" × 5 @ $150
   - Item 2: "Travel" × 2 @ $75

2. Validate: All required fields present ✓

3. Show summary:
   ```
   Quote for: Acme Ltd

   Line Items:
     1. Consulting
        Qty: 5 × $150.00 = $750.00
     2. Travel
        Qty: 2 × $75.00 = $150.00

   Subtotal: $900.00
   ```

4. Create quote in Xero

5. Return:
   ```
   Quote #QU-0001 created successfully!

   View at: https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=...
   ```

   **Always provide the clickable URL so the user can access the quote directly.**

## Running the Code

Save your quote creation script (e.g., `create-quote.ts`) and run:

```bash
tsx create-quote.ts
```

Or execute the TypeScript code directly using the Bash tool with tsx.

## Notes

- Quotes are always created as DRAFT status initially
- Contact will be created automatically if it doesn't exist
- Account code defaults to "200" (standard sales account)
- Token refresh happens automatically when needed
- **All amounts should be in dollars ($), NOT pounds (£)**
- **Always provide clickable Xero URLs when quotes are created**
