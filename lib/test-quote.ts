#!/usr/bin/env tsx
/**
 * Test Script - Create a sample quote to verify setup
 * Usage: npm test
 */

import { XeroService } from '../.claude/skills/xero-quote/lib/xero-client.js';
import { validateQuoteData, toQuoteData, formatQuoteSummary, type ParsedQuoteInput } from '../.claude/skills/xero-quote/lib/quote-mapper.js';

// Sample quote data
const sampleQuote: ParsedQuoteInput = {
  contactName: 'Test Customer Ltd',
  contactEmail: 'test@example.com',
  lineItems: [
    {
      description: 'Website Design & Development',
      quantity: 1,
      unitAmount: 2500.00,
    },
    {
      description: 'Hosting Setup (annual)',
      quantity: 1,
      unitAmount: 250.00,
    },
    {
      description: 'Training Session',
      quantity: 2,
      unitAmount: 150.00,
    },
  ],
  reference: 'TEST-001',
  termsAndConditions: 'Payment due within 30 days',
  date: new Date().toISOString().split('T')[0],
};

async function testQuoteCreation() {
  console.log('\n=== Xero Quote Creation Test ===\n');

  // Validate the quote data
  console.log('1. Validating quote data...');
  const validation = validateQuoteData(sampleQuote);

  if (!validation.valid) {
    console.error('❌ Validation failed:');
    validation.errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('✓ Validation passed\n');

  // Display summary
  console.log('2. Quote Summary:\n');
  console.log(formatQuoteSummary(sampleQuote));
  console.log('\n');

  // Initialize Xero service
  console.log('3. Connecting to Xero...');
  const xeroService = new XeroService();

  try {
    await xeroService.initialize();
    console.log('✓ Connected to Xero\n');
  } catch (error) {
    console.error('❌ Failed to connect to Xero:', error);
    console.error('\nHave you completed OAuth setup? Run: npm run auth');
    process.exit(1);
  }

  // Create the quote
  console.log('4. Creating quote in Xero...');

  try {
    const quoteData = toQuoteData(sampleQuote);
    const result = await xeroService.createQuote(quoteData);

    console.log('\n✓ Quote created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Quote Number: ${result.quoteNumber}`);
    console.log(`Quote ID: ${result.quoteID}`);
    console.log(`Status: DRAFT`);
    console.log(`\nView in Xero:`);
    console.log(result.url);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Note: The quote has been created as DRAFT.');
    console.log('You can edit or mark it as SENT in Xero.\n');
  } catch (error) {
    console.error('❌ Failed to create quote:', error);
    process.exit(1);
  }
}

// Run the test
testQuoteCreation()
  .then(() => {
    console.log('✓ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
