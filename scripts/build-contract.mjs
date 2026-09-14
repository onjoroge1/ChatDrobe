import fs from 'node:fs';
import path from 'node:path';

/** Resolve the source and invocation roots without printing environment secrets. */
export function buildContext(sourceRoot, {cwd = process.cwd(), env = process.env} = {}) {
  const root = fs.realpathSync(sourceRoot);
  const workingDirectory = fs.realpathSync(cwd);
  const invocationDirectory = fs.realpathSync(env.INIT_CWD || cwd);
  let output = path.join(root, 'dist');

  if (['1', 'true'].includes(env.VERCEL) && invocationDirectory !== root) {
    const relativeInvocation = path.relative(root, invocationDirectory);
    const isNestedProjectRoot = relativeInvocation &&
      !relativeInvocation.startsWith(`..${path.sep}`) &&
      relativeInvocation !== '..' &&
      !path.isAbsolute(relativeInvocation);

    if (!isNestedProjectRoot) {
      throw new Error(
        `ChatDrobe was launched from ${invocationDirectory}, but its package is at ${root}. ` +
        'The Vercel invocation directory must be the repository root or a directory inside it.'
      );
    }

    // Vercel resolves Output Directory relative to its configured Root Directory.
    // npm can still discover this package.json from a nested Root Directory, so emit
    // deployable files under that invocation directory instead of failing the build.
    output = path.join(invocationDirectory, 'dist');
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
