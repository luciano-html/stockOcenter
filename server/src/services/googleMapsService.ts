import { ApiError } from '../utils/ApiError';

export async function optimizeRouteStops(origin: string, waypoints: string[]) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw ApiError.internal('Google Maps API Key no configurada');
  }

  // Si hay menos de 2 destinos, no hay nada que optimizar lógicamente
  if (waypoints.length < 2) {
    return Array.from({ length: waypoints.length }, (_, i) => i);
  }

  // Google Maps requiere los waypoints en este formato
  const intermediates = waypoints.map(address => ({
    address
  }));

  try {
    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration',
          'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1'
        },
        body: JSON.stringify({
          origin: { address: origin },
          destination: { address: origin }, // Retornar al origen
          intermediates: intermediates,
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          optimizeWaypointOrder: true
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error optimizing route from Google Maps API:', response.status, errText);
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data: any = await response.json();
    const optimizedIndices = data.routes?.[0]?.optimizedIntermediateWaypointIndex || [];
    return optimizedIndices;
  } catch (error: any) {
    console.error('Error optimizing route', error?.message || error);
    throw ApiError.internal('Error al optimizar la ruta con Google Maps');
  }
}
