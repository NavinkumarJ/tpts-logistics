/**
 * Routing Service using OSRM (Open Source Routing Machine)
 * Provides real road routes like Google Maps
 * Free tier with no API key required
 */

// OSRM Demo Server (free, rate-limited for production use)
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

/**
 * Get road route between two points
 * @param {number} startLat - Starting latitude
 * @param {number} startLng - Starting longitude  
 * @param {number} endLat - Ending latitude
 * @param {number} endLng - Ending longitude
 * @returns {Promise<{coordinates: [number, number][], distance: string, duration: number, durationText: string} | null>}
 */
export async function getRoute(startLat, startLng, endLat, endLng) {
    try {
        // OSRM uses [longitude, latitude] format
        const url = `${OSRM_BASE_URL}/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&steps=false`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error("OSRM API error:", response.status);
            return null;
        }

        const data = await response.json();

        if (data.code !== "Ok" || !data.routes || !data.routes[0]) {
            console.error("OSRM returned no route:", data);
            return null;
        }

        const route = data.routes[0];

        // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

        // Distance in km (API returns meters)
        const distanceKm = (route.distance / 1000).toFixed(1);

        // Duration in minutes (API returns seconds)
        const durationMinutes = Math.round(route.duration / 60);

        // Human-readable duration
        let durationText;
        if (durationMinutes < 60) {
            durationText = `${durationMinutes} mins`;
        } else {
            const hours = Math.floor(durationMinutes / 60);
            const mins = durationMinutes % 60;
            durationText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }

        return {
            coordinates,
            distance: distanceKm,
            duration: durationMinutes,
            durationText,
        };
    } catch (error) {
        console.error("Failed to fetch route:", error);
        return null;
    }
}

/**
 * Get route with intermediate waypoints
 * @param {Array<{lat: number, lng: number}>} waypoints - Array of waypoints
 * @returns {Promise<Object | null>}
 */
export async function getRouteWithWaypoints(waypoints) {
    if (!waypoints || waypoints.length < 2) return null;

    try {
        // Build waypoints string: lng1,lat1;lng2,lat2;...
        const waypointsStr = waypoints
            .map(wp => `${wp.lng},${wp.lat}`)
            .join(";");

        const url = `${OSRM_BASE_URL}/${waypointsStr}?geometries=geojson&overview=full&steps=false`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== "Ok" || !data.routes || !data.routes[0]) {
            return null;
        }

        const route = data.routes[0];

        return {
            coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
            distance: (route.distance / 1000).toFixed(1),
            duration: Math.round(route.duration / 60),
        };
    } catch (error) {
        console.error("Failed to fetch route with waypoints:", error);
        return null;
    }
}

/**
 * Calculate straight-line distance as fallback
 * Uses Haversine formula
 */
export function calculateStraightDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
}

export default {
    getRoute,
    getRouteWithWaypoints,
    calculateStraightDistance,
};
