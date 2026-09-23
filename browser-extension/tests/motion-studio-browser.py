"""Review the packaged cat rig through real ESM, SVG and Chromium WAAPI.

This is a developer showroom fixture, not installed-extension certification.
Generated modules, contact sheet and screenshots stay in ignored preview/.
"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import functools
import html
import json
import os
import shutil
import subprocess
import sys
import threading
from playwright.sync_api import sync_playwright, expect

B = Path(__file__).resolve().parents[1]
OUT = B / 'preview'
subprocess.run([sys.executable, str(B / 'scripts/build-motion-preview.py')], check=True)
ACTIONS = ['blink', 'look', 'ears', 'breathe', 'groom', 'scratch', 'stretch', 'knead', 'yawn', 'curl']
checks = []


class FixtureHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}

    def end_headers(self):
        self.send_header('Content-Security-Policy',
                         "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                         "object-src 'none'; connect-src 'none'; base-uri 'none'")
        super().end_headers()

    def log_message(self, *args):
        pass


def ok(message):
    checks.append(message)
    print('PASS', message, flush=True)


def scrub(page, action, percent):
    page.locator('#action').select_option(action)
    page.locator('#scrub').fill(str(percent))
    # Emit even for the initial zero or a repeated pose inspection.
    page.locator('#scrub').dispatch_event('input')


def pose_snapshot(cat):
    return cat.locator('[data-bone]').evaluate_all('''nodes => nodes.map(n => {
      const style = getComputedStyle(n), r = n.getBoundingClientRect();
      return [n.dataset.bone, style.transform, style.d, style.opacity,
              r.x, r.y, r.width, r.height];
    })''')


def assert_inside(cat, action, percent, mode):
    # Check transformed geometry, including extremities, not only the viewport
    # or a copied pose-math expectation. Hidden mouths/lids do not paint.
    result = cat.evaluate('''svg => {
      const viewport = svg.getBoundingClientRect();
      const visible = n => {
        for (let p = n; p && p !== svg; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) <= .001) return false;
        }
        return true;
      };
      const outside = [...svg.querySelectorAll('path,ellipse,circle,rect,line,polyline,polygon')]
        .filter(n => !n.closest('defs') && visible(n))
        .map(n => { const r = n.getBoundingClientRect(); return {
          bone: n.closest('[data-bone]')?.dataset.bone || n.tagName,
          x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height
        }; })
        .filter(r => r.width > 0 && r.height > 0 &&
          (r.x < viewport.x - 1 || r.y < viewport.y - 1 ||
           r.right > viewport.right + 1 || r.bottom > viewport.bottom + 1));
      return {width:viewport.width, height:viewport.height, outside};
    }''')
    assert result['width'] > 100 and result['height'] > 50, (mode, result)
    assert not result['outside'], (action, percent, mode, result)


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(FixtureHandler, directory=str(OUT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.getenv('CHROMIUM_PATH', shutil.which('chromium')),
            headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1120})
        errors, csp_errors, external, failed = [], [], [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: csp_errors.append(msg.text)
                if msg.type == 'error' and ('Content Security Policy' in msg.text or 'violates' in msg.text) else None)
        page.on('request', lambda request: external.append(request.url) if not request.url.startswith(origin + '/') else None)
        page.on('response', lambda response: failed.append([response.status, response.url]) if response.status >= 400 else None)
        page.goto(origin + '/motion-studio.html')
        room = page.locator('#scene').locator('.room')
        cat = room.locator('.companion-cat')
        expect(cat).to_be_visible()
        expect(room.locator('[data-artwork="dicebear-sprouts"]')).to_have_count(1)
        assert cat.evaluate('(n) => n.getAnimations({subtree:true}).length') == 0
        ok('Unchanged ESM renderer and curated Tokyo artwork load under self-only script CSP, initially still')

        for action in ACTIONS:
            page.locator('#action').select_option(action)
            page.locator('#play').click()
            assert cat.evaluate('(n) => n.getAnimations({subtree:true}).length') > 0, action
            assert cat.evaluate('(n) => n.getAnimations({subtree:true}).every(a => a.effect.getTiming().iterations === 1)'), action
            page.locator('#stop').click()
            assert cat.evaluate('(n) => n.getAnimations({subtree:true}).length') == 0, action
            page.locator('#play').click()
            # Complete real WAAPI tracks, then let their browser finish events
            # run. This catches retained fill-forwards handles after completion.
            cat.evaluate('(n) => n.getAnimations({subtree:true}).forEach(a => a.finish())')
            for _ in range(50):
                if cat.evaluate('(n) => n.getAnimations({subtree:true}).length') == 0:
                    break
                page.wait_for_timeout(20)
            assert cat.evaluate('(n) => n.getAnimations({subtree:true}).length') == 0, action
            page.locator('#stop').click()
        ok('All ten cat performances use finite tracks and release them on explicit stop and browser completion')

        page.locator('#action').select_option('groom')
        page.locator('#play').click()
        before = cat.locator('[data-bone="frontNearPaw"]').evaluate('(n) => getComputedStyle(n).transform')
        cat.evaluate('(n) => n.getAnimations({subtree:true}).forEach(a => {a.pause(); a.currentTime = 4200;})')
        after = cat.locator('[data-bone="frontNearPaw"]').evaluate('(n) => getComputedStyle(n).transform')
        assert before != after
        tail = cat.locator('[data-bone="tailSkin"]').evaluate('(n) => getComputedStyle(n).d')
        assert tail.startswith('path(') and 'NaN' not in tail
        page.locator('#stop').click()
        ok('Browser animation moves the paw and renders a valid skinned tail path')

        widths = {}
        for mode, width, closeup in [('compact', 390, False), ('closeup', 1440, True)]:
            page.set_viewport_size({'width': width, 'height': 1120})
            page.locator('#closeup').set_checked(closeup)
            if closeup:
                expect(page.locator('.fictional-chat')).to_be_hidden()
            widths[mode] = cat.bounding_box()['width']
            for action in ACTIONS:
                for percent in [0, 25, 50, 75, 100]:
                    scrub(page, action, percent)
                    assert cat.evaluate('(n) => n.getAnimations({subtree:true}).length') == 0
                    assert_inside(cat, action, percent, mode)
                    first = pose_snapshot(cat)
                    scrub(page, 'look' if action != 'look' else 'groom', 13)
                    scrub(page, action, percent)
                    assert pose_snapshot(cat) == first, (mode, action, percent)
                if closeup:
                    scrub(page, action, 50)
                    room.locator('.companion-habitat').screenshot(path=str(OUT / f'cat-pose-{action}.png'))
            scrub(page, 'look', 0)
            page.locator('#scene-shell').screenshot(path=str(OUT / f'motion-studio-{mode}.png'))
        assert widths['closeup'] >= widths['compact'] * 2, widths
        ok('All ten poses at five progress points are repeatable and stay inside compact and enlarged habitats')

        page.emulate_media(reduced_motion='reduce')
        expect(page.locator('#play')).to_be_disabled()
        scrub(page, 'groom', 50)
        assert cat.evaluate('(n) => n.getAnimations({subtree:true}).length') == 0
        ok('Reduced motion blocks playback while preserving still-pose inspection')
        page.emulate_media(reduced_motion='no-preference')
        page.locator('#closeup').uncheck()
        for width in [360, 390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 1050})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), width
            for world in ['tokyo', 'starship', 'train']:
                page.locator('#world').select_option(world)
                expect(page.locator('#scene').locator('.room')).to_have_attribute('data-world', world)
                page.locator('#night').check()
                page.locator('#night').uncheck()
                page.locator('#play').click()
                page.locator('#stop').click()
        ok('Three environments, day/night and playback controls fit all four viewport sizes')

        assert not errors, errors
        assert not csp_errors, csp_errors
        assert not external, external
        assert not failed, failed
        page.set_viewport_size({'width': 1440, 'height': 1100})
        page.locator('#world').select_option('tokyo')
        scrub(page, 'groom', 45)
        page.screenshot(path=str(OUT / 'motion-studio-desktop.png'), full_page=True)
        ok('No uncaught errors, failed assets, external requests or CSP violations during review')

        # Compose screenshots, not cloned SVGs: repeated gradient IDs cannot
        # interfere with another pose. This static artifact has no runtime code.
        cards = ''.join(f'<figure><img src="cat-pose-{a}.png" alt="{html.escape(a)} at 50 percent"><figcaption>{html.escape(a.title())} · 50%</figcaption></figure>' for a in ACTIONS)
        (OUT / 'motion-studio-poses.html').write_text(
            '<!doctype html><html lang="en"><meta charset="utf-8"><title>ChatDrobe cat pose review</title>'
            '<style>body{margin:0;padding:28px;background:#f4f2e9;color:#2d382f;font:16px system-ui}'
            'h1{font-size:28px;margin:0 0 8px}p{margin:0 0 24px}.poses{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}'
            'figure{margin:0;background:#fffdf7;border:1px solid #d5dbcf;border-radius:12px;overflow:hidden}'
            'img{display:block;width:100%}figcaption{padding:12px;font-weight:600}</style>'
            '<h1>Companion Studio · pose review</h1><p>Actual renderer screenshots, inspected halfway through each finite performance.</p>'
            f'<div class="poses">{cards}</div></html>', encoding='utf-8')
        page.goto(origin + '/motion-studio-poses.html')
        page.screenshot(path=str(OUT / 'motion-studio-poses.png'), full_page=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()

(OUT / 'motion-studio-results.json').write_text(json.dumps({
    'passed': len(checks), 'checks': checks, 'habitatWidths': widths,
    'scope': 'Local HTTP fixture, exact packaged ESM, real Chromium SVG/WAAPI; no installed extension or live ChatGPT account'
}, indent=2), encoding='utf-8')
