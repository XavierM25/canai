import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');
        
        console.log("Recibiendo archivo:", imageFile ? "Sí" : "No");
        if (imageFile instanceof File) {
            console.log("Nombre:", imageFile.name);
            console.log("Tamaño:", imageFile.size);
            console.log("Tipo:", imageFile.type);
        }
        
        if (!imageFile || !(imageFile instanceof File)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'No se proporcionó una imagen válida'
                }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        // Crear un nuevo FormData para enviar al backend
        const backendFormData = new FormData();
        
        // Agregar el archivo con el nombre que espera el backend
        backendFormData.append('file', imageFile, imageFile.name);

        console.log('Enviando imagen al backend:', imageFile.name, 'tamaño:', imageFile.size, 'tipo:', imageFile.type);
        
        // Necesitamos usar fetch pero sin enviar headers personalizados para que se establezca
        // automáticamente el Content-Type correcto para formdata (incluye boundary)
        const response = await fetch('http://127.0.0.1:8000/analizar', {
            method: 'POST',
            body: backendFormData,
            // NO incluir headers
        });

        console.log('Respuesta del servidor:', response.status, response.statusText);

        if (!response.ok) {
            console.error(
                'Error del servidor backend:',
                response.status,
                response.statusText
            );
            
            let errorMessage = `Error del servidor: ${response.status}`;
            
            try {
                // Intentar obtener el mensaje de error JSON
                const errorData = await response.json();
                console.error('Respuesta de error JSON:', errorData);
                
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                }
                
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: errorMessage
                    }),
                    {
                        status: response.status,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );
            } catch (jsonError) {
                // Si no es JSON, obtener como texto
                try {
                    const text = await response.text();
                    console.error('Respuesta del servidor (texto):', text);
                    
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: `${errorMessage}. Detalle: ${text.substring(0, 200)}`
                        }),
                        {
                            status: response.status,
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                } catch (textError) {
                    // Si no podemos obtener ni JSON ni texto
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: `${errorMessage}. No se pudo obtener más detalles del error.`
                        }),
                        {
                            status: response.status,
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                }
            }
        }

        const data = await response.json();
        console.log('Respuesta exitosa del backend:', data);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error en el endpoint response-ai:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error 
                    ? `Error: ${error.message}` 
                    : 'Error desconocido al procesar la solicitud'
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
}

export const GET: APIRoute = async ({ request }) => {
    try {
        const url = new URL(request.url);
        const imagePath = url.searchParams.get('path');
        
        if (!imagePath) {
            return new Response('Ruta de imagen no especificada', {
                status: 400
            });
        }
        
        // Construir la URL completa al backend
        const backendUrl = `http://127.0.0.1:8000${imagePath}`;
        
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
}