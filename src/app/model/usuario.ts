export interface Usuario {
  id_usuario?: number;
  nombre_usuario: string;
  primer_nombre: string;
  segundo_nombre?: string; // Opcional
  primer_apellido: string;
  segundo_apellido?: string; // Opcional
  correo: string;
  numero_documento: string;
  
  // Relaciones (IDs para guardar)
  id_rol: number;
  id_tipo_documento: number;
  id_estado_usuario: number;
  
  // Campos extra que envía Django (UsuarioRespuestaDTO)
  nombre_rol?: string;
  nombre_tipo_documento?: string;
  nombre_estado_usuario?: string;
  
  // al crear no se manda contraseña: el back genera una y la envía al correo
}