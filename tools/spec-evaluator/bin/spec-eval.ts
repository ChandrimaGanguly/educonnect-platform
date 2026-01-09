#!/usr/bin/env node

/**
 * Executable entry point for spec-eval CLI
 */

import { CLI } from '../dist/cli/index.js';

const cli = new CLI();
cli.run(process.argv);
