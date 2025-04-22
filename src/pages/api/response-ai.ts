import type { APIRoute } from 'astro';

interface ErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

const BACKEND_URL = 'http://127.0.0.1:8000';

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');
        
        logFileInfo(imageFile);
        
        if (!imageFile || !(imageFile instanceof File)) {
            return createJsonResponse({
                success: false,
                error: 'No se proporcionó una imagen válida'
            }, 400);
        }

        // Crear un nuevo FormData para enviar al backend
        const backendFormData = new FormData();
        backendFormData.append('file', imageFile, imageFile.name);

        console.log('Enviando imagen al backend:', imageFile.name, 'tamaño:', imageFile.size, 'tipo:', imageFile.type);
        
        // Realizar la solicitud al backend
        try {
            const response = await fetch(`${BACKEND_URL}/analizar`, {
                method: 'POST',
                body: backendFormData,
            });

            console.log('Respuesta del servidor:', response.status, response.statusText);

            if (!response.ok) {
                return await handleErrorResponse(response);
            }

            const data = await response.json();
            console.log('Respuesta exitosa del backend:', data);

            return createJsonResponse(data, 200);
        } catch (fetchError) {
            console.error('Error en la comunicación con el backend:', fetchError);
            return createJsonResponse({
                success: false,
                error: fetchError instanceof Error 
                    ? `Error de comunicación: ${fetchError.message}` 
                    : 'Error de comunicación con el servidor de análisis'
            }, 502);
        }
    } catch (error) {
        console.error('Error en el endpoint response-ai:', error);

        return createJsonResponse({
            success: false,
            error: error instanceof Error 
                ? `Error: ${error.message}` 
                : 'Error desconocido al procesar la solicitud'
        }, 500);
    }
};

export const GET: APIRoute = async ({ request }) => {
    try {
        const url = new URL(request.url);
        const imagePath = url.searchParams.get('path');
        
        if (!imagePath) {
            return new Response('Ruta de imagen no especificada', {
                status: 400
            });
        }
        
        // Construir la URL completa al backend (asegurando que empiece con /)
        const backendUrl = `${BACKEND_URL}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
        
        console.log('Solicitando imagen del backend:', backendUrl);
        
        // Hacer la solicitud al backend
        const response = await fetch(backendUrl);
        
        if (!response.ok) {
            return new Response(`Error al obtener la imagen: ${response.status} ${response.statusText}`, {
                status: response.status
            });
        }
        
        // Obtener el tipo de contenido
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        // Obtener los datos de la imagen
        const imageData = await response.arrayBuffer();
        
        // Devolver la imagen
        return new Response(imageData, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400'
            }
        });
    } catch (error) {
        console.error('Error al proxy de imagen:', error);
        
        return new Response(
            `Error al obtener la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            {
                status: 500
            }
        );
    }
};

// Funciones de utilidad
function logFileInfo(file: unknown): void {
    console.log("Recibiendo archivo:", file ? "Sí" : "No");
    if (file instanceof File) {
        console.log("Nombre:", file.name);
        console.log("Tamaño:", file.size);
        console.log("Tipo:", file.type);
    }
}

function createJsonResponse(data: object, status: number): Response {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

async function handleErrorResponse(response: Response): Promise<Response> {
    console.error(
        'Error del servidor backend:',
        response.status,
        response.statusText
    );
    
    let errorMessage = `Error del servidor: ${response.status}`;
    
    try {
        // Intentar obtener el mensaje de error JSON
        const errorData: ErrorResponse = await response.json();
        console.error('Respuesta de error JSON:', errorData);
        
        if (errorData.detail) {
            errorMessage = errorData.detail;
        } else if (errorData.message) {
            errorMessage = errorData.message;
        } else if (errorData.error) {
            errorMessage = errorData.error;
        }
        
        return createJsonResponse({
            success: false,
            error: errorMessage
        }, response.status);
    } catch (jsonError) {
        // Si no es JSON, obtener como texto
        try {
            const text = await response.text();
            console.error('Respuesta del servidor (texto):', text);
            
            return createJsonResponse({
                success: false,
                error: `${errorMessage}. Detalle: ${text.substring(0, 200)}`
            }, response.status);
        } catch (textError) {
            // Si no podemos obtener ni JSON ni texto
            return createJsonResponse({
                success: false,
                error: `${errorMessage}. No se pudo obtener más detalles del error.`
            }, response.status);
        }
    }
}