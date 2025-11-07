/**
 * Xero Client Wrapper
 * Handles authentication, token refresh, and API operations
 */

import { XeroClient, Quote, Contact, LineItem } from 'xero-node';
import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from 'dotenv';

config();

const CLIENT_ID = process.env.XERO_CLIENT_ID;
const CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const REDIRECT_URI = process.env.XERO_REDIRECT_URI || 'http://localhost:3000/callback';
const TENANT_ID = process.env.XERO_TENANT_ID;
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

interface Credentials {
  tokenSet: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  tenantId: string;
  updatedAt: string;
}

export interface QuoteData {
  contactName: string;
  contactEmail?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    accountCode?: string;
  }>;
  reference?: string;
  termsAndConditions?: string;
  date?: string;
}

export class XeroService {
  private client: XeroClient;
  private tenantId: string;
  private credentials?: Credentials;

  constructor() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('XERO_CLIENT_ID and XERO_CLIENT_SECRET must be set in .env');
    }

    this.client = new XeroClient({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUris: [REDIRECT_URI],
      scopes: 'openid profile email accounting.transactions accounting.contacts offline_access'.split(' '),
    });

    this.tenantId = TENANT_ID || '';
  }

  /**
   * Initialize client by loading and refreshing tokens
   */
  async initialize(): Promise<void> {
    try {
      const credentialsData = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
      this.credentials = JSON.parse(credentialsData);

      if (!this.credentials) {
        throw new Error('No credentials found');
      }

      // Set token set
      await this.client.setTokenSet(this.credentials.tokenSet);

      // Use tenant ID from credentials if not in env
      if (!this.tenantId) {
        this.tenantId = this.credentials.tenantId;
      }

      // Refresh token if expired or about to expire (within 5 minutes)
      const expiresAt = this.credentials.tokenSet.expires_at * 1000;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (now >= expiresAt - fiveMinutes) {
        console.log('Access token expired or expiring soon, refreshing...');
        await this.refreshToken();
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize Xero client: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'Have you run "npm run auth" to set up OAuth?'
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(): Promise<void> {
    try {
      const validTokenSet = await this.client.refreshToken();

      // Save updated tokens
      if (this.credentials) {
        this.credentials.tokenSet = validTokenSet as any;
        this.credentials.updatedAt = new Date().toISOString();
        await fs.writeFile(CREDENTIALS_PATH, JSON.stringify(this.credentials, null, 2));
      }
    } catch (error) {
      throw new Error(
        `Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'You may need to re-authorize by running "npm run auth"'
      );
    }
  }

  /**
   * Find contact by name (exact or partial match)
   */
  async findContact(name: string): Promise<Contact | null> {
    try {
      const response = await this.client.accountingApi.getContacts(
        this.tenantId,
        undefined, // modifiedSince
        `Name.Contains("${name}")`, // where clause
        undefined, // order
        undefined, // IDs
        undefined, // page
        undefined, // includeArchived
        undefined, // summaryOnly
        undefined  // searchTerm
      );

      if (response.body.contacts && response.body.contacts.length > 0) {
        return response.body.contacts[0];
      }

      return null;
    } catch (error) {
      console.error(`Error finding contact "${name}":`, error);
      return null;
    }
  }

  /**
   * Create a new contact
   */
  async createContact(name: string, email?: string): Promise<Contact> {
    try {
      const newContact: Contact = {
        name,
        emailAddress: email,
      };

      const response = await this.client.accountingApi.createContacts(
        this.tenantId,
        { contacts: [newContact] }
      );

      if (response.body.contacts && response.body.contacts.length > 0) {
        return response.body.contacts[0];
      }

      throw new Error('Failed to create contact');
    } catch (error) {
      throw new Error(
        `Failed to create contact: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a quote in Xero
   */
  async createQuote(quoteData: QuoteData): Promise<{ quoteID: string; quoteNumber: string; url: string }> {
    try {
      // Find or create contact
      let contact = await this.findContact(quoteData.contactName);

      if (!contact) {
        console.log(`Contact "${quoteData.contactName}" not found, creating...`);
        contact = await this.createContact(quoteData.contactName, quoteData.contactEmail);
      }

      if (!contact.contactID) {
        throw new Error('Contact must have a contactID');
      }

      // Build line items
      const lineItems: LineItem[] = quoteData.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
        accountCode: item.accountCode || '200', // Default sales account
        lineAmount: item.quantity * item.unitAmount,
      }));

      // Create quote object
      const quote: Quote = {
        contact: {
          contactID: contact.contactID,
        },
        lineItems,
        date: quoteData.date || new Date().toISOString().split('T')[0],
        reference: quoteData.reference,
        terms: quoteData.termsAndConditions,
      };

      // Create quote via API
      const response = await this.client.accountingApi.createQuotes(
        this.tenantId,
        { quotes: [quote] },
        false, // summarizeErrors
        Math.random().toString(36).substring(7) // idempotency key
      );

      if (!response.body.quotes || response.body.quotes.length === 0) {
        throw new Error('No quote returned from API');
      }

      const createdQuote = response.body.quotes[0];

      return {
        quoteID: createdQuote.quoteID || '',
        quoteNumber: createdQuote.quoteNumber || '',
        url: `https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${createdQuote.quoteID}`,
      };
    } catch (error) {
      throw new Error(
        `Failed to create quote: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a quote by ID
   */
  async getQuote(quoteID: string): Promise<Quote | null> {
    try {
      const response = await this.client.accountingApi.getQuote(this.tenantId, quoteID);

      if (response.body.quotes && response.body.quotes.length > 0) {
        return response.body.quotes[0];
      }

      return null;
    } catch (error) {
      console.error(`Error getting quote ${quoteID}:`, error);
      return null;
    }
  }

  /**
   * Update quote status to SENT
   */
  async markQuoteAsSent(quoteID: string): Promise<void> {
    try {
      const quote = await this.getQuote(quoteID);

      if (!quote) {
        throw new Error('Quote not found');
      }

      quote.status = Quote.StatusEnum.SENT;

      await this.client.accountingApi.updateQuote(
        this.tenantId,
        quoteID,
        { quotes: [quote] }
      );
    } catch (error) {
      throw new Error(
        `Failed to mark quote as sent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
