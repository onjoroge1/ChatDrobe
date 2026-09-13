import fs from 'node:fs';
import path from 'node:path';

/** Resolve the source and invocation roots without printing environment secrets. */
export function buildContext(sourceRoot, {cwd = process.cwd(), env = process.env} = {}) {
  const root = fs.realpathSync(sourceRoot);
  const workingDirectory = fs.realpathSync(cwd);
  const invocationDirectory = fs.realpathSync(env.INIT_CWD || cwd);
  const output = path.join(root, 'dist');
  if (['1', 'true'].includes(env.VERCEL) && invocationDirectory !== root) {
    throw new Error(
      `ChatDrobe was launched from ${invocationDirectory}, but its package is at ${root}. ` +
      'Set Vercel Root Directory to the repository root (leave the field empty), ' +
      'Framework Preset to Other, and Output Directory to dist. ' +
      'npm can find a parent package.json while Vercel looks for output in the selected subdirectory.'
    );
  }
  return {root, workingDirectory, invocationDirectory, output};
}

/** A success message must mean actual, nonempty deployable files exist. */
export function verifyBuildOutput(output) {
  const required = ['index.html', '404.html', 'robots.txt', 'build-manifest.json',
    'assets/client.js', 'assets/styles.css', 'assets/worlds.css'];
  for (const relative of required) {
    const file = path.join(output, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) {
      throw new Error(`Missing or empty build artifact: ${file}`);
    }
  }
  return required.length;
}
