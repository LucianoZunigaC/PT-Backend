# ADR-0003: Filtro Dinámico de Categorías y Matching Jaccard

## Status
Aceptado

## Context
Al buscar herramientas o materiales (por ejemplo, "Bosch" o "Caterpillar"), los scrapers extraían y guardaban "juguetes", "botas de seguridad" y "ropa" que no pertenecían al rubro duro de la construcción. Además, cada proveedor llamaba a los mismos productos de formas ligeramente distintas (ej: "Saco Cemento 25kg" vs "Cemento 25 kilos agregar al carro").
Las listas negras estáticas de palabras (`blacklist`) no eran suficientes para detener toda la basura.

## Decision
1. Implementar validación estricta de la taxonomía del e-commerce (migas de pan / categorías).
2. Implementar un modelo de similitud del Coeficiente de Jaccard con umbral > 65% para agrupar productos idénticos.
3. Introducir eliminación robusta de Stop-Words de tienda (ej: "despacho", "comprar").

## Rationale
- Revisar la **categoría** reportada por la página misma (ej. si Sodimac dice "Categorías > Juguetes") permite rechazar el producto antes de que llegue a la base de datos, ahorrando miles de lecturas/escrituras inútiles y RAM de Playwright.
- El **algoritmo de Jaccard** (porcentaje de palabras en común) es matemático, eficiente e independiente del orden de las palabras, resolviendo el problema de las nomenclaturas dispares.

## Consequences
### Positivas
- La base de datos se mantiene limpia de productos irrelevantes.
- Reducción enorme en el número de registros duplicados del mismo ítem en la base de datos.
- Mayor velocidad de scraping general debido a la interrupción temprana del proceso.
### Negativas
- Mayor procesamiento de CPU al calcular el `jaccardSimilarity` y tokenizar las cadenas durante la inserción.
- Falsos negativos potenciales: un producto válido categorizado erróneamente por el e-commerce podría ser descartado.
