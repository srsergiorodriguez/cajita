# Fichas de prueba

Cuatro imágenes abstractas + dos CSV para probar la importación de fichas.

## Opción A — sin esquema (la más rápida)

1. Abre **Fichas**.
2. Usa **importar CSV** y elige `fichas-basico.csv`.
3. Importa las fichas y colócalas con **colocar en la página**.
4. O usa **importar ZIP** con `fichas-ejemplo.zip`: imágenes y CSV entran juntos.

Este CSV solo usa `code,label,image`, así que funciona aunque el esquema esté vacío.

## Opción B — con metadatos

Primero crea estos campos en **Fichas → Esquema**:

| Nombre | Clave | Tipo | Obligatorio |
|---|---|---|---|
| Autor | `autor` | texto | no |
| Año | `anio` | texto | no |
| Técnica | `tecnica` | texto | no |
| Enlace | `enlace` | URL | no |

Después:

- importa `fichas-esquema.csv` con **importar CSV**, o
- usa **importar ZIP** con `fichas-ejemplo-esquema.zip`.

El ZIP de esquema usa un `fichas.csv` con esas columnas. Si el esquema está vacío,
la importación se bloquea a propósito por columnas desconocidas.

## Archivos

- `images/` — cuatro PNG de prueba.
- `fichas-basico.csv` — códigos, nombres e imágenes.
- `fichas-esquema.csv` — añade autor, año, técnica y enlace.
- `fichas-ejemplo.zip` — CSV básico + imágenes, para importación en un paso.
- `fichas-ejemplo-esquema.zip` — CSV con metadatos + imágenes.

Las imágenes son abstractas y libres para probar.
