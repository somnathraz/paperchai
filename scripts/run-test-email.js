#!/usr/bin/env node

/**
 * Simple wrapper to run test-email.ts with .env loaded
 */

require('dotenv').config();
require('ts-node/register');
require('./test-email.ts');
