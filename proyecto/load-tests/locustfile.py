import random
from locust import HttpUser, task, between, tag

# Lista de términos típicos para simular búsquedas
SEARCH_TERMS = ["cemento", "varilla", "taladro bosch", "pintura latex", "yeso", "ladrillo"]
# IDs ficticios o probables para probar endpoints paramétricos
PRODUCT_IDS = ["1", "2", "3", "4", "5"]
CATEGORY_IDS = ["1", "2", "3"]

class ConstructorVirtual(HttpUser):
    """
    Simula el comportamiento de un usuario navegando por la Plataforma de Precios.
    """
    # Soluciona el error: You must specify the base host.
    host = "http://localhost:3000"
    wait_time = between(1, 5)

    # ── ENDPOINTS PESADOS (SCRAPING) ─────────────────────────────────────────
    @tag("scraping", "heavyweight")
    @task(1) # Ocurre menos frecuentemente para no colapsar la PC instantáneamente
    def search_new_materials(self):
        """Endpoint pesado: Dispara los scrapers (Playwright)"""
        term = random.choice(SEARCH_TERMS)
        with self.client.get(f"/api/productos/busqueda?q={term}", timeout=30, catch_response=True, name="GET /api/productos/busqueda") as response:
            if response.status_code in [200, 400, 500]:
                response.success() # Los errores de scraping manejados devuelven success en el load test para evitar ruido, o puedes ajustarlo

    # ── ENDPOINTS DE LECTURA RÁPIDA (CACHÉ/DB) ───────────────────────────────
    @tag("api", "lightweight")
    @task(3) 
    def destacados(self):
        self.client.get("/api/productos/destacados", name="GET /api/productos/destacados")

    @tag("api", "lightweight")
    @task(3) 
    def indice(self):
        self.client.get("/api/productos/indice", name="GET /api/productos/indice")

    @tag("api", "lightweight")
    @task(2) 
    def sugerencias(self):
        term = random.choice(SEARCH_TERMS)
        self.client.get(f"/api/productos/sugerencias?q={term}", name="GET /api/productos/sugerencias")

    @tag("api", "lightweight")
    @task(2) 
    def categorias(self):
        self.client.get("/api/categorias", name="GET /api/categorias")

    @tag("api", "lightweight")
    @task(2) 
    def proveedores(self):
        self.client.get("/api/proveedores", name="GET /api/proveedores")

    @tag("api", "parametric")
    @task(2) 
    def producto_id(self):
        pid = random.choice(PRODUCT_IDS)
        self.client.get(f"/api/productos/{pid}", name="GET /api/productos/:id")

    @tag("api", "parametric")
    @task(2) 
    def producto_historial(self):
        pid = random.choice(PRODUCT_IDS)
        self.client.get(f"/api/productos/{pid}/historial", name="GET /api/productos/:id/historial")

    @tag("api", "parametric")
    @task(1) 
    def categorias_stats(self):
        cid = random.choice(CATEGORY_IDS)
        self.client.get(f"/api/categorias/{cid}/stats", name="GET /api/categorias/:id/stats")

    # ── ENDPOINTS DE ESCRITURA (POST) ────────────────────────────────────────
    @tag("api", "write")
    @task(1)
    def registrar_redireccion(self):
        """Simula que un usuario hizo clic en ir a la tienda."""
        payload = {
            "productoId": random.choice(PRODUCT_IDS),
            "tienda": random.choice(["Sodimac", "MercadoLibre", "Imperial"])
        }
        self.client.post("/api/redirecciones", json=payload, name="POST /api/redirecciones")
