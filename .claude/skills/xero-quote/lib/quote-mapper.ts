/**
 * Quote Mapper
 * Utilities to parse and structure quote data from verbal/text input
 */

import { QuoteData } from './xero-client.js';

export interface ParsedLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode?: string;
}

export interface ParsedQuoteInput {
  contactName: string;
  contactEmail?: string;
  lineItems: ParsedLineItem[];
  reference?: string;
  termsAndConditions?: string;
  date?: string;
}

/**
 * Validate parsed quote data
 */
export function validateQuoteData(data: ParsedQuoteInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check contact name
  if (!data.contactName || data.contactName.trim() === '') {
    errors.push('Contact name is required');
  }

  // Check line items
  if (!data.lineItems || data.lineItems.length === 0) {
    errors.push('At least one line item is required');
  } else {
    data.lineItems.forEach((item, index) => {
      if (!item.description || item.description.trim() === '') {
        errors.push(`Line item ${index + 1}: description is required`);
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`Line item ${index + 1}: quantity must be a positive number`);
      }
      if (typeof item.unitAmount !== 'number' || item.unitAmount < 0) {
        errors.push(`Line item ${index + 1}: unit amount must be a non-negative number`);
      }
    });
  }

  // Check email format if provided
  if (data.contactEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contactEmail)) {
      errors.push('Invalid email address format');
    }
  }

  // Check date format if provided (YYYY-MM-DD)
  if (data.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert parsed input to QuoteData format
 */
export function toQuoteData(input: ParsedQuoteInput): QuoteData {
  return {
    contactName: input.contactName.trim(),
    contactEmail: input.contactEmail?.trim(),
    lineItems: input.lineItems.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      accountCode: item.accountCode || '200', // Default sales account
    })),
    reference: input.reference?.trim(),
    termsAndConditions: input.termsAndConditions?.trim(),
    date: input.date || new Date().toISOString().split('T')[0],
  };
}

/**
 * Calculate quote totals
 */
export function calculateTotals(lineItems: ParsedLineItem[]) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitAmount, 0);

  return {
    subtotal,
    // Xero calculates tax based on account settings, so we don't calculate it here
    lineItemCount: lineItems.length,
    totalQuantity: lineItems.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/**
 * Format quote summary for display
 */
export function formatQuoteSummary(input: ParsedQuoteInput): string {
  const totals = calculateTotals(input.lineItems);

  let summary = `Quote for: ${input.contactName}\n`;

  if (input.contactEmail) {
    summary += `Email: ${input.contactEmail}\n`;
  }

  summary += `\nLine Items:\n`;

  input.lineItems.forEach((item, index) => {
    const lineTotal = item.quantity * item.unitAmount;
    summary += `  ${index + 1}. ${item.description}\n`;
    summary += `     Qty: ${item.quantity} × $${item.unitAmount.toFixed(2)} = $${lineTotal.toFixed(2)}\n`;
  });

  summary += `\nSubtotal: $${totals.subtotal.toFixed(2)}`;

  if (input.reference) {
    summary += `\nReference: ${input.reference}`;
  }

  if (input.date) {
    summary += `\nDate: ${input.date}`;
  }

  return summary;
}

/**
 * Parse common currency formats to decimal
 * Examples: "$50", "$100.50", "25.99", "1,500.00"
 */
export function parseCurrency(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }

  // Remove currency symbols and commas
  const cleaned = value.replace(/[$€,]/g, '').trim();
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    throw new Error(`Invalid currency format: ${value}`);
  }

  return parsed;
}

/**
 * Parse quantity from text
 * Examples: "10", "5.5", "1/2" (0.5)
 */
export function parseQuantity(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }

  // Handle fractions like "1/2"
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/').map((n) => parseFloat(n.trim()));
    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
      throw new Error(`Invalid fraction format: ${value}`);
    }
    return numerator / denominator;
  }

  const parsed = parseFloat(value.trim());

  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid quantity: ${value}`);
  }

  return parsed;
}
