// mismas reglas que el back (sistema_erp/validaciones.py), asi el error sale apenas se da guardar
// el back igual vuelve a validar todo, esto es solo para avisar mas rapido

export type Errores = { [campo: string]: string };

const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const PATRON_NOMBRE = new RegExp(`^[${LETRAS}]+( [${LETRAS}]+)*$`);
const PATRON_USUARIO = /^[A-Za-z0-9._]+$/;
const PATRON_CORREO = /^[a-z0-9]+([._%+-][a-z0-9]+)*@[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*\.(?<dominio>[a-z]{2,})$/;

export const DOMINIOS_VALIDOS = new Set([
  'com', 'co', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'io', 'app', 'dev',
  'online', 'store', 'shop', 'tech', 'site', 'me', 'us', 'es', 'mx', 'ar', 'cl', 'pe', 'ec',
  've', 'br', 'uy', 'py', 'bo', 'pa', 'cr', 'gt', 'do', 'uk', 'de', 'fr', 'it', 'pt', 'ca',
]);

export function limpiar(valor: any): string {
  return typeof valor === 'string' ? valor.split(/\s+/).filter(Boolean).join(' ') : (valor ?? '').toString();
}

export function validarTexto(errores: Errores, campo: string, valor: any, etiqueta: string,
                             requerido = true, minimo = 1, maximo = 50): string {
  const texto = limpiar(valor);
  if (!texto) {
    if (requerido) errores[campo] = `${etiqueta} es obligatorio`;
    return '';
  }
  if (texto.length < minimo) errores[campo] = `${etiqueta} debe tener mínimo ${minimo} caracteres`;
  else if (texto.length > maximo) errores[campo] = `${etiqueta} debe tener máximo ${maximo} caracteres`;
  return texto;
}

export function validarNombrePersona(errores: Errores, campo: string, valor: any, etiqueta: string, requerido = true): string {
  const texto = validarTexto(errores, campo, valor, etiqueta, requerido, 2, 50);
  if (texto && !errores[campo] && !PATRON_NOMBRE.test(texto)) {
    errores[campo] = `${etiqueta} solo puede tener letras y espacios`;
  }
  return texto;
}

export function validarNombreUsuario(errores: Errores, campo: string, valor: any): string {
  const texto = validarTexto(errores, campo, valor, 'El nombre de usuario', true, 4, 50);
  if (texto && !errores[campo]) {
    if (texto.includes(' ')) errores[campo] = 'El nombre de usuario no puede tener espacios';
    else if (!PATRON_USUARIO.test(texto)) errores[campo] = 'El nombre de usuario solo puede tener letras, números, punto y guion bajo';
    else if (/^\d+$/.test(texto)) errores[campo] = 'El nombre de usuario no puede ser solo números';
  }
  return texto;
}

export function validarCorreo(errores: Errores, campo: string, valor: any): string {
  const texto = validarTexto(errores, campo, valor, 'El correo', true, 6, 50).toLowerCase();
  if (!texto || errores[campo]) return texto;
  if (texto.includes(' ')) {
    errores[campo] = 'El correo no puede tener espacios';
    return texto;
  }
  const coincide = PATRON_CORREO.exec(texto);
  if (!coincide) {
    errores[campo] = 'El correo no tiene un formato válido (ej. usuario@empresa.com)';
  } else if (!DOMINIOS_VALIDOS.has(coincide.groups!['dominio'])) {
    errores[campo] = `La terminación '.${coincide.groups!['dominio']}' del correo no es válida, revisa que esté bien escrito`;
  }
  return texto;
}

export function validarDocumento(errores: Errores, campo: string, valor: any, idTipo: number): string {
  const texto = validarTexto(errores, campo, valor, 'El número de documento', true, 1, 30).replace(/ /g, '');
  if (!texto || errores[campo]) return texto;
  if (!/^\d+$/.test(texto)) errores[campo] = 'El número de documento solo puede tener números (sin puntos ni guiones)';
  else if (texto.startsWith('0')) errores[campo] = 'El número de documento no puede empezar en 0';
  else if (idTipo === 1 && (texto.length < 6 || texto.length > 10)) errores[campo] = 'La cédula de ciudadanía debe tener entre 6 y 10 dígitos';
  else if (idTipo === 2 && (texto.length < 6 || texto.length > 12)) errores[campo] = 'La cédula de extranjería debe tener entre 6 y 12 dígitos';
  return texto;
}

export function validarEntero(errores: Errores, campo: string, valor: any, etiqueta: string,
                              minimo?: number, maximo?: number): number | null {
  if (valor === null || valor === undefined || valor === '') {
    errores[campo] = `${etiqueta} es obligatorio`;
    return null;
  }
  const numero = Number(valor);
  if (!Number.isInteger(numero)) {
    errores[campo] = `${etiqueta} debe ser un número entero`;
    return null;
  }
  if (minimo !== undefined && numero < minimo) errores[campo] = `${etiqueta} debe ser mínimo ${minimo}`;
  else if (maximo !== undefined && numero > maximo) errores[campo] = `${etiqueta} debe ser máximo ${maximo.toLocaleString('es-CO')}`;
  return numero;
}

export function validarPrecio(errores: Errores, campo: string, valor: any, etiqueta: string, maximo: number): number | null {
  if (valor === null || valor === undefined || valor === '') {
    errores[campo] = `${etiqueta} es obligatorio`;
    return null;
  }
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    errores[campo] = `${etiqueta} debe ser un número`;
    return null;
  }
  if (Math.round(numero * 100) / 100 !== numero) errores[campo] = `${etiqueta} puede tener máximo 2 decimales`;
  else if (numero <= 0) errores[campo] = `${etiqueta} debe ser mayor que cero`;
  else if (numero > maximo) errores[campo] = `${etiqueta} no puede ser mayor que ${maximo.toLocaleString('es-CO')}`;
  return numero;
}

export function validarContrasenia(errores: Errores, campo: string, valor: any, etiqueta = 'La contraseña'): string {
  const texto = typeof valor === 'string' ? valor : '';
  if (!texto) errores[campo] = `${etiqueta} es obligatoria`;
  else if (texto.length < 8) errores[campo] = `${etiqueta} debe tener mínimo 8 caracteres`;
  else if (texto.length > 64) errores[campo] = `${etiqueta} debe tener máximo 64 caracteres`;
  else if (texto.includes(' ')) errores[campo] = `${etiqueta} no puede tener espacios`;
  else if (!/[A-Z]/.test(texto) || !/[a-z]/.test(texto) || !/\d/.test(texto)) {
    errores[campo] = `${etiqueta} debe tener al menos una mayúscula, una minúscula y un número`;
  }
  return texto;
}

// convierte la respuesta de error del back en errores por campo
export function erroresDelServidor(err: any, mensajePorDefecto: string): { errores: Errores; mensaje: string } {
  if (err?.status === 0) {
    return { errores: {}, mensaje: 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.' };
  }
  const cuerpo = err?.error ?? {};
  const errores: Errores = { ...(cuerpo.errores ?? {}) };
  const mensaje = errores['general'] || (Object.keys(errores).length ? '' : (cuerpo.message || mensajePorDefecto));
  delete errores['general'];
  return { errores, mensaje };
}
