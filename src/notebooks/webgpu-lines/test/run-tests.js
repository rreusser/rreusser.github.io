#!/usr/bin/env node
/**
 * Run all WebGPU line rendering tests
 *
 * Usage:
 *   node run-tests.js [--update] [--filter=pattern]
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

const updateMode = process.argv.includes('--update');
const filterArg = process.argv.find(a => a.startsWith('--filter='));
const filter = filterArg ? filterArg.split('=')[1] : null;

// Find all test JSON files
function findTests() {
  const tests = [];
  const entries = fs.readdirSync(fixturesDir);

  for (const entry of entries) {
    if (entry.endsWith('.json')) {
      const name = entry.replace('.json', '');
      tests.push(name);
    }
  }

  return tests.sort();
}

// Run a single test in a subprocess
function runTest(testName, update) {
  return new Promise((resolve) => {
    const args = [path.join(__dirname, 'run-test.js'), testName];
    if (update) args.push('--update');

    const child = spawn('node', args, {
      cwd: __dirname,
      stdio: ['inherit', 'pipe', 'ignore']  // ignore stderr noise from WebGPU
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      try {
        const result = JSON.parse(output.trim());
        resolve(result);
      } catch {
        resolve({
          status: code === 0 ? 'pass' : 'error',
          name: testName,
          message: output.trim() || `Exit code ${code}`
        });
      }
    });

    child.on('error', (err) => {
      resolve({
        status: 'error',
        name: testName,
        message: err.message
      });
    });
  });
}

async function main() {
  const tests = findTests();
  const filteredTests = filter
    ? tests.filter(t => t.includes(filter))
    : tests;

  console.log('\x1b[1mWebGPU Lines Tests\x1b[0m');
  console.log(`Mode: ${updateMode ? '\x1b[33mUPDATE\x1b[0m' : 'TEST'}`);
  if (filter) console.log(`Filter: ${filter}`);
  console.log(`\nRunning ${filteredTests.length} test(s)...\n`);

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let updated = 0;

  for (const testName of filteredTests) {
    const result = await runTest(testName, updateMode);

    switch (result.status) {
      case 'pass':
        console.log(`  ${testName}... \x1b[32mPASS\x1b[0m${result.diffPercent > 0 ? ` (${result.diffPercent.toFixed(2)}%)` : ''}`);
        passed++;
        break;

      case 'updated':
        console.log(`  ${testName}... \x1b[33mUPDATED\x1b[0m`);
        updated++;
        break;

      case 'fail':
        console.log(`  ${testName}... \x1b[31mFAIL\x1b[0m (${result.diffPercent.toFixed(2)}% different)`);
        failed++;
        break;

      case 'missing':
        console.log(`  ${testName}... \x1b[33mNO EXPECTED\x1b[0m`);
        skipped++;
        break;

      case 'skip':
        console.log(`  ${testName}... \x1b[33mSKIP\x1b[0m (${result.message})`);
        skipped++;
        break;

      case 'error':
        console.log(`  ${testName}... \x1b[31mERROR\x1b[0m: ${result.message}`);
        failed++;
        break;

      default:
        console.log(`  ${testName}... \x1b[31mUNKNOWN\x1b[0m: ${JSON.stringify(result)}`);
        failed++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  if (updateMode) {
    console.log(`\x1b[1mUpdated: ${updated}\x1b[0m`);
  } else {
    console.log(`\x1b[1mResults: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m, \x1b[33m${skipped} skipped\x1b[0m`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
