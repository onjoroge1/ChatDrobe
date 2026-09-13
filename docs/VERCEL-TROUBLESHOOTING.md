# Vercel reports a successful build but cannot find dist

## Observed on September 13, 2026

Deployment `dpl_Ha7vrc6m9QiyuMCLYG2TF8one9V7`, commit `3292a66`, ended with `STATIC_BUILD_NO_OUT_DIR` after generating 22 pages and 12 appearance files. The connected project is named **chatdrone** (project ID `prj_ViFAeWcZjC2QosWGUkzzbFc9JQDC`) and is linked to `onjoroge1/ChatDrobe`. Its returned project metadata specifies **framework: python** and Node **24.x**.

This is a static website with a Node build, not a Python application. Python is used only for browser tests. The source already declares `framework: null` and `outputDirectory: dist` in vercel.json. Align the dashboard preset as well. The connector response does not expose the selected Root Directory, so its actual value was not verified.

## Correct dashboard settings

Settings → Build and Deployment:

| Setting | Value |
| --- | --- |
| Framework Preset | Other, not Python |
| Root Directory | Repository root; leave the field empty, not tests, scripts, src, or dist |
| Build Command | npm run build |
| Output Directory | dist |
| Install Command | npm install --ignore-scripts |
| Node.js | 22.x, also pinned in package.json by this patch |

Keep `SITE_INDEXABLE=false`. No domain, store URL or billing change is needed to address this build error. Save the settings and create a fresh deployment of the intended branch/commit without reusing its build cache. Verify which commit the new deployment actually built.

## Why the root matters

The script writes to the repository's dist directory. Running `npm run build` inside `tests/` can still succeed because npm locates the parent package.json and runs its build from there. The files exist in the parent dist directory, while no tests/dist directory exists. This reproduces the observed success-message/missing-directory pattern locally; it does not by itself prove the failed deployment selected tests/.

The patch logs source root, npm invocation directory, current working directory, Node version and output path. It fails early for an identified non-root Vercel invocation and checks that essential files are present and nonempty before reporting success. It does not copy output to guessed directories or change the correct dist contract to public.

## Validation and limitations

`npm run check` runs the existing checks plus regression tests for the deployment path contract, missing output, a clean hosted-like fixture and Node version pin. The existing HTTP Chromium workflow remains unchanged. A green local or GitHub test is not proof of a successful Vercel deployment. Inspect new Vercel logs and keep Issue #4 open until hosted checks pass.

The >=22 warning was separate from the fatal output-directory error. Pinning 22.x prevents an automatic major-version change; it is not claimed to fix the output collection failure alone.

References:
- https://vercel.com/docs/builds/configure-a-build
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/deployments/troubleshoot-a-build
