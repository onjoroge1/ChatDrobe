import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {buildContext,verifyBuildOutput} from '../scripts/build-contract.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatdrobe-build-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.mkdirSync(path.join(dir, 'tests'));
  return dir;
}

test('Vercel repository-root invocation resolves the declared dist output', () => {
  const context = buildContext(root, {cwd: root, env: {VERCEL: '1', INIT_CWD: root}});
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json')));
  assert.equal(context.output, path.join(root, config.outputDirectory));
  assert.equal(config.framework, null);
});

test('Vercel nested npm invocation emits output under the configured project root', t => {
  const dir = fixture(t);
  const nestedRoot = path.join(dir, 'tests');
  const context = buildContext(dir, {
    cwd: dir, env: {VERCEL: '1', INIT_CWD: nestedRoot}
  });
  assert.equal(context.root, dir);
  assert.equal(context.invocationDirectory, nestedRoot);
  assert.equal(context.output, path.join(nestedRoot, 'dist'));
});

test('Vercel invocation outside the package root is rejected', t => {
  const dir = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'chatdrobe-outside-'));
  t.after(() => fs.rmSync(outside, {recursive: true, force: true}));
  assert.throws(() => buildContext(dir, {
    cwd: dir, env: {VERCEL: '1', INIT_CWD: outside}
  }), /must be the repository root or a directory inside it/);
});

test('local direct invocation stays anchored to the source root', t => {
  const dir = fixture(t);
  assert.equal(buildContext(dir, {cwd: path.join(dir, 'tests'), env: {}}).output, path.join(dir, 'dist'));
});

test('output verification rejects absent and empty artifacts', t => {
  const dir = fixture(t);
  assert.throws(() => verifyBuildOutput(dir), /Missing or empty/);
  fs.writeFileSync(path.join(dir, 'index.html'), '');
  assert.throws(() => verifyBuildOutput(dir), /Missing or empty.*index.html/);
});

test('a clean hosted-like build writes and verifies all deployment artifacts', t => {
  const dir = fixture(t);
  for (const entry of ['scripts', 'src', 'site.config.json', 'package.json', 'vercel.json']) {
    fs.cpSync(path.join(root, entry), path.join(dir, entry), {recursive: true});
  }
  const env = {...process.env, VERCEL: '1', VERCEL_ENV: 'preview', INIT_CWD: dir, SITE_INDEXABLE: 'false'};
  delete env.SITE_URL;
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {cwd: dir, env, encoding: 'utf8', timeout: 15000});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Verified deployable output at/);
  assert.equal(verifyBuildOutput(path.join(dir, 'dist')), 7);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'dist/build-manifest.json')));
  const themes = JSON.parse(fs.readFileSync(path.join(dir, 'src/themes.json')));
  const staticRoutes = ['/', '/themes/', '/install/', '/how-it-works/', '/help/', '/privacy/',
    '/architecture/', '/changelog/', '/features/', '/premium/', '/pricing/', '/go-to-market/', '/beta-use/'];
  const expected = [...staticRoutes, ...themes.map(theme => `/themes/${theme.id}/`)];
  assert.deepEqual([...manifest.routes].sort(), expected.sort());
  for (const route of expected) {
    const file = path.join(dir, 'dist', route === '/' ? 'index.html' : route.slice(1) + 'index.html');
    assert.ok(fs.statSync(file).isFile() && fs.statSync(file).size > 0, route);
  }
  assert.match(fs.readFileSync(path.join(dir, 'dist/robots.txt'), 'utf8'), /Disallow: \//);
});

test('Node major is pinned to the CI-tested runtime, not an open-ended range', () => {
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).engines.node, '22.x');
});
