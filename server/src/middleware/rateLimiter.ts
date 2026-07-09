// Rate limiting deshabilitado temporalmente.
// Para producción: usar express-rate-limit con store Redis para persistencia
// y reinicio independiente del proceso. Ver docs/sdd/11-correctivos-rendimiento-seguridad.md.

export const globalLimiter = (_req: unknown, _res: unknown, next: () => void) => next();
export const authLimiter = (_req: unknown, _res: unknown, next: () => void) => next();
