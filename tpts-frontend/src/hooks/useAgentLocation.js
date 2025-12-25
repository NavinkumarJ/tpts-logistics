import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../utils/api';
import toast from 'react-hot-toast';

/**
 * Hook for agent location sharing
 * Continuously updates agent's GPS location to the server
 */
export function useAgentLocationSharing(agentId, options = {}) {
    const {
        intervalMs = 10000, // Update every 10 seconds
        enableHighAccuracy = false, // Use low accuracy for faster, more reliable updates
        onLocationUpdate = null,
        onError = null,
    } = options;

    const [isSharing, setIsSharing] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);

    const watchIdRef = useRef(null);
    const intervalRef = useRef(null);

    // Send location to server
    const sendLocationToServer = useCallback(async (latitude, longitude) => {
        if (!agentId) return;

        try {
            await apiClient.patch(`/agents/location`, {
                latitude,
                longitude
            });
            setLastUpdate(new Date());
            setError(null);
            onLocationUpdate?.({ latitude, longitude });
        } catch (err) {
            console.error('Failed to send location:', err);
            setError('Failed to update location');
            onError?.(err);
        }
    }, [agentId, onLocationUpdate, onError]);

    // Get current position and send to server
    const updateLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            return;
        }

        // Try with medium accuracy first (faster and more reliable)
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy: acc } = position.coords;
                setCurrentLocation({ latitude, longitude });
                setAccuracy(acc);
                sendLocationToServer(latitude, longitude);
                setError(null);
            },
            (err) => {
                console.warn('First geolocation attempt failed:', err.message);

                // If we have a cached location, use it instead of failing
                if (currentLocation) {
                    console.log('Using cached location');
                    sendLocationToServer(currentLocation.latitude, currentLocation.longitude);
                    return;
                }

                // Retry with lower accuracy and much longer timeout
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude, accuracy: acc } = position.coords;
                        setCurrentLocation({ latitude, longitude });
                        setAccuracy(acc);
                        sendLocationToServer(latitude, longitude);
                        setError(null);
                    },
                    (fallbackErr) => {
                        console.error('Geolocation fallback also failed:', fallbackErr.message);
                        const errorMsg = fallbackErr.code === 1
                            ? 'Location permission denied. Please enable in browser settings.'
                            : fallbackErr.code === 2
                                ? 'Location unavailable. Check if GPS is enabled.'
                                : 'Location request timed out. Try again.';
                        setError(errorMsg);
                        onError?.(fallbackErr);
                    },
                    { enableHighAccuracy: false, timeout: 60000, maximumAge: 300000 } // 60s timeout, 5min cache
                );
            },
            { enableHighAccuracy: false, timeout: 30000, maximumAge: 120000 } // 30s timeout, 2min cache
        );
    }, [sendLocationToServer, onError, currentLocation]);

    // Start sharing location
    const startSharing = useCallback(() => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported');
            return false;
        }

        setIsSharing(true);
        setError(null);

        // Get initial location immediately
        updateLocation();

        // Set up interval for periodic updates
        intervalRef.current = setInterval(updateLocation, intervalMs);

        toast.success('Location sharing started');
        return true;
    }, [updateLocation, intervalMs]);

    // Stop sharing location
    const stopSharing = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsSharing(false);
        toast.success('Location sharing stopped');
    }, []);

    // Toggle sharing
    const toggleSharing = useCallback(() => {
        if (isSharing) {
            stopSharing();
        } else {
            startSharing();
        }
    }, [isSharing, startSharing, stopSharing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return {
        isSharing,
        currentLocation,
        accuracy,
        lastUpdate,
        error,
        startSharing,
        stopSharing,
        toggleSharing,
        updateLocationNow: updateLocation,
    };
}

/**
 * Hook for tracking agent location (customer/company side)
 * Subscribes to WebSocket updates for real-time tracking
 */
export function useAgentLocationTracking(trackingNumber) {
    const [agentLocation, setAgentLocation] = useState(null);
    const [eta, setEta] = useState(null);
    const [distance, setDistance] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!trackingNumber) return;

        // Dynamic import to avoid SSR issues
        import('../services/websocketService').then(({ connectWebSocket, subscribeToAgentLocation, disconnectWebSocket }) => {
            connectWebSocket(
                () => {
                    setIsConnected(true);
                    subscribeToAgentLocation(trackingNumber, (locationData) => {
                        setAgentLocation({
                            lat: locationData.agentLat,
                            lng: locationData.agentLng,
                        });
                        setEta(locationData.etaText);
                        setDistance(locationData.distanceKm);
                    });
                },
                (error) => {
                    console.error('WebSocket error:', error);
                    setIsConnected(false);
                }
            );
        });

        return () => {
            import('../services/websocketService').then(({ unsubscribe }) => {
                unsubscribe(`/topic/agent-location/${trackingNumber}`);
            });
        };
    }, [trackingNumber]);

    return {
        agentLocation,
        eta,
        distance,
        isConnected,
    };
}

export default {
    useAgentLocationSharing,
    useAgentLocationTracking,
};
