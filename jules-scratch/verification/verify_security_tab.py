from playwright.sync_api import sync_playwright
from pymongo import MongoClient
import time

def setup_database():
    client = MongoClient('mongodb://localhost:27017/')
    db = client.mjfood
    restaurants = db.restaurante_estadisticas

    restaurants.delete_one({'extension': 'test'})

    restaurants.insert_one({
        'extension': 'test',
        'token': 'password',
        'nombre': 'Test Restaurant',
        'clientes': []
    })
    client.close()

def run(playwright):
    setup_database()
    browser = playwright.chromium.launch()
    page = browser.new_page()

    try:
        page.goto("http://localhost:3000/admin/login")

        page.fill("input[name=extension]", "test")
        page.fill("input[name=password]", "password")
        page.click("button[type=submit]")

        # Esperar a que el panel principal cargue
        page.wait_for_selector("#tab-seguridad")

        # Hacer clic en la pestaña de seguridad
        page.click("#tab-seguridad")

        # Esperar a que el formulario sea visible
        page.wait_for_selector("#form-cambiar-token")

        # Pequeña pausa para asegurar que el renderizado de la UI se complete
        time.sleep(1)

        page.screenshot(path="jules-scratch/verification/security-tab-verification.png")
        print("Captura de pantalla guardada en jules-scratch/verification/security-tab-verification.png")

    except Exception as e:
        print(f"Ocurrió un error: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
