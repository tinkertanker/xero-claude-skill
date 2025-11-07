#!/usr/bin/env tsx
/**
 * OAuth Helper - Run this once to authorize and get initial tokens
 * Usage: npm run auth
 */

import { XeroClient } from 'xero-node';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from 'dotenv';

config();

const CLIENT_ID = process.env.XERO_CLIENT_ID;
const CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const REDIRECT_URI = process.env.XERO_REDIRECT_URI || 'http://localhost:3000/callback';
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: XERO_CLIENT_ID and XERO_CLIENT_SECRET must be set in .env file');
  console.error('Copy .env.example to .env and add your credentials');
  process.exit(1);
}

const xero = new XeroClient({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUris: [REDIRECT_URI],
  scopes: 'openid profile email accounting.transactions accounting.contacts offline_access'.split(' '),
});

async function saveTokens(tokenSet: any, tenantId: string) {
  const credentials = {
    tokenSet,
    tenantId,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
  console.log(`\n✓ Tokens saved to ${CREDENTIALS_PATH}`);
}

async function startAuthFlow() {
  return new Promise<void>(async (resolve, reject) => {
    const consentUrl = await xero.buildConsentUrl();

    console.log('\n=== Xero OAuth Authorization ===\n');
    console.log('1. Open this URL in your browser:\n');
    console.log(consentUrl);
    console.log('\n2. Authorize the application');
    console.log('3. You\'ll be redirected back automatically\n');
    console.log('Waiting for callback...\n');

    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = url.parse(req.url || '', true);

        if (reqUrl.pathname === '/callback') {
          const code = reqUrl.query.code as string;

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Error: No authorization code received</h1>');
            server.close();
            reject(new Error('No authorization code received'));
            return;
          }

          // Exchange code for tokens - pass full URL
          const tokenSet = await xero.apiCallback(req.url || '');

          // Get tenant/organisation info
          const tenants = await xero.updateTenants();
          if (!tenants || tenants.length === 0) {
            throw new Error('No Xero organisations found');
          }

          const tenantId = tenants[0].tenantId;
          const tenantName = tenants[0].tenantName;

          // Save tokens and tenant ID
          await saveTokens(tokenSet, tenantId);

          console.log(`✓ Connected to Xero organisation: ${tenantName}`);
          console.log(`✓ Tenant ID: ${tenantId}`);
          console.log('\nAdd this to your .env file:');
          console.log(`XERO_TENANT_ID=${tenantId}\n`);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Xero Authorization Success</title></head>
              <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h1 style="color: #13B5EA;">✓ Authorization Successful</h1>
                <p>You've successfully connected to Xero organisation: <strong>${tenantName}</strong></p>
                <p>Tenant ID: <code>${tenantId}</code></p>
                <p>You can close this window and return to your terminal.</p>
              </body>
            </html>
          `);

          server.close();
          resolve();
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } catch (error) {
        console.error('Error during OAuth callback:', error);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error: ${error instanceof Error ? error.message : 'Unknown error'}</h1>`);
        server.close();
        reject(error);
      }
    });

    server.listen(3000, () => {
      console.log('Callback server listening on http://localhost:3000');
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      reject(error);
    });
  });
}

// Run the auth flow
startAuthFlow()
  .then(() => {
    console.log('\n✓ OAuth setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ OAuth setup failed:', error);
    process.exit(1);
  });
