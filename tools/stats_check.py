"""Quick visual + console check for the /stats login page."""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(exist_ok=True)


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append((m.type, m.text)) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(("pageerror", str(e))))

        page.goto("http://127.0.0.1:8765/stats/", wait_until="networkidle")
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / "stats_login_desktop.png"), full_page=False)

        ctx2 = browser.new_context(viewport={"width": 393, "height": 852}, is_mobile=True)
        page2 = ctx2.new_page()
        page2.on("console", lambda m: errors.append((m.type, m.text)) if m.type == "error" else None)
        page2.on("pageerror", lambda e: errors.append(("pageerror", str(e))))
        page2.goto("http://127.0.0.1:8765/stats/", wait_until="networkidle")
        page2.wait_for_timeout(800)
        page2.screenshot(path=str(OUT / "stats_login_mobile.png"), full_page=False)

        # Also check the main site for JS errors with the tracker added
        ctx3 = browser.new_context(viewport={"width": 1280, "height": 800})
        page3 = ctx3.new_page()
        page3.on("console", lambda m: errors.append(("main", m.type, m.text)) if m.type == "error" else None)
        page3.on("pageerror", lambda e: errors.append(("main pageerror", str(e))))
        page3.goto("http://127.0.0.1:8765/", wait_until="networkidle")
        page3.wait_for_timeout(2000)  # let tracker have a chance to fire
        browser.close()

        if errors:
            print("CONSOLE / PAGE ERRORS:")
            for e in errors: print(" ", e)
        else:
            print("No console errors. OK")

if __name__ == "__main__":
    run()
