"""Mobile responsiveness audit using Playwright.

Loads the local site at multiple mobile viewport sizes, takes full-page screenshots,
and reports any horizontal overflow.

Run from the gerardobarberena conda env:
    python tools/mobile_audit.py
"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/"
OUT_DIR = Path(__file__).parent.parent / "tools" / "screenshots"
OUT_DIR.mkdir(parents=True, exist_ok=True)

DEVICES = [
    ("iphone_se",       375, 667,  2),
    ("iphone_14",       393, 852,  3),
    ("iphone_pro_max",  430, 932,  3),
    ("galaxy_s20",      360, 800,  3),
    ("very_narrow_320", 320, 720,  2),
    ("tablet_768",      768, 1024, 2),
    ("desktop_1280",   1280, 800,  1),
    ("desktop_1440",   1440, 900,  1),
]

LANGS = ["en", "es", "zh", "fr"]

# CSS injected so reveal animations don't hide content in static screenshots
REVEAL_OFF = """
  .reveal, .reveal.visible { opacity: 1 !important; transform: none !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
"""


def real_overflow(page):
    """Filter out decorative elements that are clipped by parent overflow:hidden."""
    return page.evaluate("""
        () => {
          const html = document.documentElement;
          if (html.scrollWidth <= html.clientWidth) return [];
          const vw = html.clientWidth;
          const bad = [];
          document.querySelectorAll('body *').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right <= vw + 1 || r.width <= 4) return;
            let p = el.parentElement, clipped = false;
            while (p) {
              const cs = getComputedStyle(p);
              if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') { clipped = true; break; }
              p = p.parentElement;
            }
            if (!clipped) {
              bad.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.className || '').toString().slice(0, 60),
                right: Math.round(r.right),
                vw: vw,
              });
            }
          });
          return bad.slice(0, 6);
        }
    """)


def run():
    issues = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, w, h, scale in DEVICES:
            ctx = browser.new_context(
                viewport={"width": w, "height": h},
                device_scale_factor=scale,
                is_mobile=w < 700,
                has_touch=w < 700,
            )
            page = ctx.new_page()
            page.goto(URL, wait_until="networkidle")
            page.add_style_tag(content=REVEAL_OFF)
            page.wait_for_timeout(400)

            sw_cw = page.evaluate(
                "() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})"
            )
            overflow = sw_cw["sw"] > sw_cw["cw"]
            bad = real_overflow(page)

            status = "OK " if not bad else "BAD"
            print(f"[{status}] {name:<18} {w}x{h}  doc {sw_cw['sw']}px / vp {sw_cw['cw']}px")
            for b in bad:
                issues += 1
                print(f"        overflow: <{b['tag']} class='{b['cls']}'> right={b['right']} vw={b['vw']}")

            page.screenshot(path=str(OUT_DIR / f"{name}_en.png"), full_page=True)

            # Extra: each language on iPhone SE
            if name == "iphone_se":
                for lang in LANGS:
                    page.evaluate(f"localStorage.setItem('gb_lang', '{lang}')")
                    page.reload(wait_until="networkidle")
                    page.add_style_tag(content=REVEAL_OFF)
                    page.wait_for_timeout(300)
                    page.screenshot(path=str(OUT_DIR / f"{name}_{lang}.png"), full_page=True)

            # Extra: viewport-only (above-the-fold) hero capture at desktop sizes
            if name in ("desktop_1280", "desktop_1440", "tablet_768"):
                page.screenshot(path=str(OUT_DIR / f"{name}_hero.png"), full_page=False)

            ctx.close()
        browser.close()
    print(f"\nScreenshots saved to: {OUT_DIR}")
    return issues


if __name__ == "__main__":
    sys.exit(0 if run() == 0 else 1)
