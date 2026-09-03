# El documento de avance

Cada proyecto puede apuntar a un Markdown de su propio repositorio. El Centro de
Trabajo lo lee y lo muestra en la ficha del proyecto, con sus capturas.

Lo leen **socios y clientes**. Casi nunca son técnicos, y cuando lo son tampoco
quieren leer git: quieren ver qué se hizo, qué sigue y poder pedir cosas.

## Un archivo aparte, no el README

No apuntes esto a un `README.md` ni a un `ESTADO.md` de trabajo. Esos documentos
existen para quien programa, y suelen traer rutas de configuración, consultas
SQL, nombres de variables de entorno y deuda técnica. Nada de eso le sirve a un
cliente, y parte de ello es mejor no enseñarlo.

La convención es un archivo propio:

```
docs/AVANCE.md
docs/capturas/…
```

Las capturas van **junto al documento**: la función solo sirve imágenes que
estén dentro de la carpeta del `.md`, y solo archivos de imagen.

## Cómo se conecta

En la ficha del proyecto → **Editar** → *Documento de avance*: `docs/AVANCE.md`.
La rama se deja vacía para usar la principal.

## Plantilla

```markdown
# Nombre del proyecto

Una línea que explique qué es, para alguien que llega sin contexto.

## Lo último que se hizo

Dos o tres frases en lenguaje llano. Qué cambió y qué se puede hacer ahora que
antes no se podía.

![Descripción de la captura](capturas/pantalla.png)

## En qué vamos

| Etapa | Estado |
|---|---|
| Catálogo | Listo |
| Contratos | En curso |
| Reportes | Siguiente |

## Lo que sigue

1. Lo próximo
2. Lo de después

## Lo que necesito de ti

- Fotos reales de las habitaciones
- Confirmar el texto legal

> Si algo no cuadra, escríbelo en Solicitudes dentro del proyecto.
```

## El encargo para el agente

Esto es lo que le pides a Claude Code (o a quien trabaje el repo) al final de una
sesión. Pégalo tal cual:

> Actualiza `docs/AVANCE.md` con lo que hicimos en esta sesión.
>
> Ese archivo lo leen mi socio y mi cliente, que no son técnicos. Escribe en
> español llano: nada de nombres de archivo, funciones, ramas, SQL ni jerga de
> git. Explica qué cambió en términos de lo que ahora se puede hacer.
>
> Mantén estas secciones: qué es el proyecto, lo último que se hizo, en qué
> vamos (tabla de etapas), lo que sigue, y lo que necesito de ti. Actualiza la
> fecha.
>
> Si tomaste capturas de pantalla, guárdalas en `docs/capturas/` y
> referéncialas con ruta relativa, por ejemplo `![Panel](capturas/panel.png)`.
>
> No copies aquí nada de `ESTADO.md` ni de las notas internas: rutas de
> configuración, llaves, variables de entorno o deuda técnica no van en este
> archivo.

## Qué se ve y qué no

| | Dueño y socio | Cliente |
|---|---|---|
| Enlaces del proyecto | sí | sí |
| Último cambio (una línea) | sí | sí |
| Documento de avance | sí | sí |
| Historial de commits con sha | sí, detrás de «Ver historial» | no |
| Dirección del repositorio | sí | no |

El mensaje del último cambio se limpia antes de mostrarlo: a
`feat(admin): panel interno de operación` se le quita el prefijo y queda
*«Panel interno de operación»*. El texto es el mismo, solo sin la jerga.
