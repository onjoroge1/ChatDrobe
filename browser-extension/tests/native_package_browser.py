"""Native MV3 package/import smoke test against a local page at the allowed origin.

Run ``npm run package:extension`` first, then this script with the pinned Playwright
requirements and ``python -m playwright install --with-deps chromium`` installed.
The bundled Chromium channel supports extensions in a persistent headless context:
https://playwright.dev/python/docs/chrome-extensions

This does not certify sign-in, Premium entitlement, or the live ChatGPT DOM. It
loads the actual review ZIP, uses real Chrome IPC for the free theme, and imports
the Living Worlds graph from the fixture page so Chrome enforces the manifest's
web_accessible_resources. No chrome mocks, private signing keys, or access grants.
"""

import json
import re
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[2]
EXTENSION = ROOT / "browser-extension"
RELEASE = json.loads((ROOT / "release.json").read_text())["extension"]
ARCHIVE = ROOT / "artifacts/extension" / f"chatdrobe-extension-{RELEASE['version']}.zip"
OUTPUT = EXTENSION / "preview/native-package-smoke.json"
FIXTURE_URL = "https://chatgpt.com/__chatdrobe_native_package_fixture__"
FIXTURE = (EXTENSION / "tests/fixture.html").read_text()
REMOVED_RESOURCE = "living/art/svg-art.mjs"


def unpack_review_zip(destination):
    assert ARCHIVE.is_file(), "Run npm run package:extension before this test."
    with ZipFile(ARCHIVE) as archive:
        assert archive.testzip() is None, "Review ZIP is corrupt."
        for entry in archive.infolist():
            relative = Path(entry.filename)
            assert not relative.is_absolute() and ".." not in relative.parts
            if not entry.is_dir():
                source = ROOT / RELEASE["source"] / relative
                assert source.is_file() and archive.read(entry) == source.read_bytes(), (
                    f"Stale review ZIP entry: {entry.filename}; rebuild the package."
                )
        archive.extractall(destination)


def module_import(page, extension_id, resource):
    return page.evaluate(
        """async url => {
            try {
                const module = await import(url);
                return {ok: true, exports: Object.keys(module).sort()};
            } catch (error) {
                return {ok: false, error: String(error.message || error)};
            }
        }""",
        f"chrome-extension://{extension_id}/{resource}",
    )


def run_case(playwright, directory, broken=False):
    package = directory / "extension"
    unpack_review_zip(package)
    if broken:
        manifest_path = package / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        removed = 0
        for group in manifest["web_accessible_resources"]:
            removed += group["resources"].count(REMOVED_RESOURCE)
            group["resources"] = [r for r in group["resources"] if r != REMOVED_RESOURCE]
        assert removed == 1, "Negative control must remove the actual explicit resource."
        assert (package / REMOVED_RESOURCE).is_file(), "Keep the resource file for the WAR test."
        manifest_path.write_text(json.dumps(manifest))

    context = playwright.chromium.launch_persistent_context(
        str(directory / "profile"),
        channel="chromium",
        headless=True,
        args=[f"--disable-extensions-except={package}", f"--load-extension={package}"],
        viewport={"width": 1440, "height": 1000},
    )
    try:
        context.set_default_timeout(15_000)

        # Only this bounded local fixture is served; do not contact ChatGPT, the
        # sign-in service, or a third-party artwork host from a test page.
        def local_fixture(route):
            if route.request.url == FIXTURE_URL and route.request.resource_type == "document":
                route.fulfill(status=200, content_type="text/html", body=FIXTURE)
            else:
                route.abort("blockedbyclient")

        context.route(re.compile(r"^https?://"), local_fixture)
        worker = next((w for w in context.service_workers if w.url.endswith("/background.js")), None)
        if worker is None:
            worker = context.wait_for_event("serviceworker", predicate=lambda w: w.url.endswith("/background.js"))
        extension_id = worker.url.split("/")[2]
        assert re.fullmatch(r"[a-p]{32}", extension_id), worker.url
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(FIXTURE_URL)
        expect(page.locator("html")).to_have_attribute("data-md-enabled", "true")
        diagnostics = worker.evaluate(
            """async url => {
                const tabs = await chrome.tabs.query({url: 'https://chatgpt.com/*'});
                const tab = tabs.find(tab => tab.url === url);
                if (!tab) throw new Error('Native fixture tab was not found.');
                return chrome.tabs.sendMessage(tab.id, {scope: 'mooddock', kind: 'diagnostics'});
            }""",
            FIXTURE_URL,
        )
        assert diagnostics["ok"] is True, diagnostics
        assert diagnostics["experience"]["revision"] >= 0, diagnostics
        assert diagnostics["experience"]["state"] == "applied", diagnostics

        engine = module_import(page, extension_id, "living/engine.mjs")
        art = module_import(page, extension_id, REMOVED_RESOURCE)
        if broken:
            assert not art["ok"], "Chrome allowed an artwork module omitted from the manifest."
            assert not engine["ok"], "Living graph unexpectedly loaded with inaccessible transitive artwork."
        else:
            assert art["ok"], art
            assert engine["ok"] and "createEnvironment" in engine["exports"], engine
        assert not errors, errors
        return {
            "case": "missing-WAR-negative-control" if broken else "review-ZIP",
            "userAgent": page.evaluate("navigator.userAgent"),
            "nativeContentScript": diagnostics["experience"],
            "engineImport": engine,
            "artImport": art,
        }
    finally:
        context.close()


def main():
    results = []
    OUTPUT.parent.mkdir(exist_ok=True)
    try:
        with sync_playwright() as playwright, TemporaryDirectory(prefix="chatdrobe-package-") as temporary:
            directory = Path(temporary)
            results.append(run_case(playwright, directory / "valid"))
            print("PASS: review ZIP loads native worker/content scripts and Living Worlds module graph.", flush=True)
            results.append(run_case(playwright, directory / "negative", broken=True))
            print("PASS: removing svg-art.mjs from WAR blocks the transitive graph while the free theme still works.", flush=True)
    finally:
        OUTPUT.write_text(json.dumps({
            "scope": "Native Chromium packaging/IPC and allowed-origin imports using local HTML; no live sign-in, Premium, or ChatGPT certification.",
            "archive": str(ARCHIVE.relative_to(ROOT)),
            "cases": results,
        }, indent=2) + "\n")


if __name__ == "__main__":
    main()
