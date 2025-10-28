from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000/admin/login")

        page.fill("input[name='username']", "javis")
        page.fill("input[name='password']", "a1q2vcnw")
        page.click("button[type='submit']")

        page.wait_for_url("http://localhost:3000/admin/panel")

        page.screenshot(path="jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
