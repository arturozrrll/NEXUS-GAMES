
/**
 * SERVICIO DESACTIVADO POR PETICIÓN DEL USUARIO
 * No se permite la generación de datos falsos/IA.
 */
export const generateGameMetadata = async (gameTitle: string): Promise<any> => {
    throw new Error("La generación de metadatos por IA ha sido desactivada.");
};
