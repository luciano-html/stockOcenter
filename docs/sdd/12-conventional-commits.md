# Conventional Commits — Guía del proyecto

Este proyecto sigue [Conventional Commits](https://www.conventionalcommits.org/) para mantener un historial de git claro, legible y fácil de automatizar.

## Formato básico

```
<tipo>(<alcance opcional>): <descripción>

<cuerpo opcional>

<footer opcional>
```

Ejemplo:

```
fix(client): corrige filtrado del autocomplete de componentes
```

## Tipos permitidos

| Tipo | Cuándo usar |
|------|-------------|
| `feat` | Nueva funcionalidad o feature. |
| `fix` | Corrección de un bug. |
| `refactor` | Cambio de código que no agrega feature ni corrige bug. |
| `perf` | Mejora de rendimiento. |
| `test` | Agrega o corrige tests. |
| `docs` | Cambios en documentación. |
| `style` | Cambios de formato, espacios, puntos y coma, etc. Sin cambio de lógica. |
| `chore` | Tareas de mantenimiento (deps, scripts, configs). |
| `ci` | Cambios en CI/CD. |
| `build` | Cambios que afectan el build o dependencias externas. |
| `revert` | Revierte un commit anterior. |

## Alcance recomendado

El alcance indica el área afectada. Usar uno de estos cuando aplique:

- `client`: frontend React/Vite.
- `server`: backend Node/Express.
- `api`: rutas o endpoints.
- `db`: modelos, migraciones o schemas de MongoDB.
- `ui`: componentes visuales reutilizables.
- `auth`: autenticación o autorización.
- `stock`: módulo de stock.
- `componentes`: módulo de componentes.
- `ordenes`: módulo de órdenes de trabajo.
- `tipos-silla`: módulo de tipos de silla.
- `docs`: documentación.

## Reglas de redacción

1. **Descripción en infinitivo** y en minúscula después de los dos puntos.
   - ✅ `feat(client): agrega búsqueda por tipo de silla`
   - ❌ `feat(client): Agrega búsqueda por tipo de silla`
   - ❌ `feat(client): agregué búsqueda por tipo de silla`

2. **Sin punto final** en la descripción.
   - ✅ `fix(server): valida cantidad positiva en ingreso de stock`
   - ❌ `fix(server): valida cantidad positiva en ingreso de stock.`

3. **Un commit por cambio lógico**. No mezclar varias cosas.
   - ✅ `feat(api): expone endpoint de resumen de stock`
   - ✅ `fix(client): corrige cálculo de stock disponible`
   - ❌ `feat(api): expone endpoint y fix(client): corrige cálculo`

4. **Cuerpo opcional**: explicar el porqué si no es obvio.

   ```
   fix(client): corrige filtrado del autocomplete

   El input se sincronizaba con el valor seleccionado en cada render,
   pisando lo que el usuario escribía. Ahora solo se sincroniza cuando
   cambia la selección externa.
   ```

## Ejemplos comunes

```
feat(client): agrega alerta de stock bajo en dashboard
fix(server): corrige reserva de stock al finalizar orden
refactor(client): extrae hook useStockMovements
perf(server): agrega índice a movimientos por componenteId
docs: actualiza política de commits
chore(client): actualiza dependencias de desarrollo
```

## Commits múltiples en una misma sesión

Si en una sesión se hacen varios cambios independientes, separarlos en commits distintos:

```
fix(client): corrige filtrado del autocomplete
docs: agrega guía de Conventional Commits
```

## Revisión antes de commitear

Antes de confirmar un commit:

1. Ejecutar `git status` para ver archivos modificados.
2. Ejecutar `git diff --stat` (o `git diff` si es necesario) para revisar el contenido.
3. Asegurarse de que no se incluyan archivos de build (`client/dist/`), logs o configs locales.
4. Verificar que el mensaje siga esta guía.
5. Confirmar con el usuario antes de `git commit` y `git push`.
