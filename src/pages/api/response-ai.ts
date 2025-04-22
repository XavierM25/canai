import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json()

        const response = await fetch('', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            console.error(
                'Error del servidor backend:',
                response.status,
                response.statusText
            )
            const text = await response.text()
            console.error('Respuesta del servidor:', text)

            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Error del servidor: ${response.status} ${response.statusText}`,
                }),
                {
                    status: response.status,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )
        }

        const data = await response.json()

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    } catch (error) {
        console.error('Error en el endpoint send-email:', error)

        return new Response(
            JSON.stringify({
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Error al procesar la solicitud',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )
    }
}
