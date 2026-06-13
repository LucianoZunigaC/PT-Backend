# Pruebas de Carga y Rendimiento (Load Testing)

Esta carpeta contiene la suite de Quality Assurance (QA) y Pruebas de Rendimiento de la Plataforma de Precios utilizando **Locust**, una herramienta basada en Python capaz de simular enjambres masivos de usuarios concurrentes.

## Requisitos Previos

1. Tener [Python 3.8+](https://www.python.org/downloads/) instalado en tu sistema.
2. Tener el Backend de Node.js de la plataforma **ejecutándose** (`npm run dev` en la raíz del proyecto) para poder atacarlo.

## 🛠️ Instalación del Entorno (Windows PowerShell)

Abre una terminal en esta carpeta (`load-tests`) y ejecuta:

```powershell
# 1. Crear un entorno virtual aislado (recomendado)
python -m venv venv

# 2. Activar el entorno virtual
.\venv\Scripts\Activate.ps1

# 3. Instalar Locust
pip install -r requirements.txt
```

*(Si usas Linux/Mac, para activar usa `source venv/bin/activate`)*.

## 🚀 Ejecución de las Pruebas

Existen dos formas de ejecutar Locust: la gráfica (recomendada) y la de consola pura (para integración continua).

### Opción 1: Interfaz Gráfica (Web UI) - Recomendado

1. En tu consola (con el `venv` activado), corre el siguiente comando:
   ```powershell
   locust -f locustfile.py
   ```
2. Abre tu navegador web en: **[http://localhost:8089](http://localhost:8089)**
3. Verás la interfaz de Locust. Te pedirá tres datos:
   - **Number of users**: La cantidad máxima de usuarios concurrentes (Ej: `50`).
   - **Spawn rate**: Cuántos usuarios nuevos aparecen por segundo (Ej: `2`).
   - **Host**: La URL base de tu backend local: `http://localhost:3000`
4. Haz clic en **"Start Swarming"**.

En las pestañas superiores podrás ver gráficos en tiempo real (*Charts*) de:
- **Total Requests per Second (RPS):** Cuántas peticiones por segundo atiende tu API.
- **Response Times (ms):** Cuánto se demora el servidor (Latencia y Percentil 95%).
- **Number of Users:** Crecimiento poblacional.

### Opción 2: Modo Headless (Consola)

Ideal si quieres hacer un test rápido por terminal sin abrir navegadores:

```powershell
# Simula 20 usuarios, naciendo a un ritmo de 2 por segundo, durante 1 minuto apuntando al localhost
locust -f locustfile.py --headless -u 20 -r 2 --run-time 1m --host http://localhost:3000
```

## 📊 Estrategia del Test (¿Qué hace el código?)

Si revisas `locustfile.py`, verás que hemos programado dos comportamientos ponderados:

1. **`view_cached_products` (Peso 3):** Simula navegar por la caché. Es una petición "Ligera" (*lightweight*) que estresa PostgreSQL pero no consume RAM. Ocurrirá 3 veces más seguido.
2. **`search_new_materials` (Peso 1):** Simula buscar un término dinámico en la caja de búsqueda. Es una petición "Pesada" (*heavyweight*) que levanta a Playwright. 

**Cuidado:** Hacer pruebas de concurrencia muy agresivas (> 100 usuarios simultáneos disparando búsquedas) en tu máquina local *puede* congelar tu PC, ya que Playwright intentará levantar decenas de navegadores Chromium reales al mismo tiempo. Sube los números gradualmente.
