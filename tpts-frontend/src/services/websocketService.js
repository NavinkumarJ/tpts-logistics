import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const WS_URL = 'http://localhost:8080/ws';

let stompClient = null;
let subscriptions = {};

/**
 * Initialize WebSocket connection
 */
export const connectWebSocket = (onConnect, onError) => {
    if (stompClient && stompClient.connected) {
        console.log('WebSocket already connected');
        onConnect?.();
        return;
    }

    stompClient = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        debug: (str) => console.log('[STOMP]', str),
    });

    stompClient.onConnect = () => {
        console.log('WebSocket connected');
        onConnect?.();
    };

    stompClient.onStompError = (frame) => {
        console.error('STOMP error:', frame);
        onError?.(frame);
    };

    stompClient.onWebSocketClose = () => {
        console.log('WebSocket closed');
    };

    stompClient.activate();
};

/**
 * Disconnect WebSocket
 */
export const disconnectWebSocket = () => {
    if (stompClient) {
        Object.keys(subscriptions).forEach(key => {
            subscriptions[key]?.unsubscribe();
        });
        subscriptions = {};
        stompClient.deactivate();
        stompClient = null;
    }
};

/**
 * Subscribe to agent location updates for a parcel
 */
export const subscribeToAgentLocation = (trackingNumber, callback) => {
    if (!stompClient || !stompClient.connected) {
        console.warn('WebSocket not connected');
        return null;
    }

    const destination = `/topic/agent-location/${trackingNumber}`;

    if (subscriptions[destination]) {
        subscriptions[destination].unsubscribe();
    }

    subscriptions[destination] = stompClient.subscribe(destination, (message) => {
        try {
            const locationData = JSON.parse(message.body);
            callback(locationData);
        } catch (e) {
            console.error('Failed to parse location data:', e);
        }
    });

    console.log(`Subscribed to ${destination}`);
    return subscriptions[destination];
};

/**
 * Subscribe to parcel tracking updates
 */
export const subscribeToParcelTracking = (trackingNumber, callback) => {
    if (!stompClient || !stompClient.connected) {
        console.warn('WebSocket not connected');
        return null;
    }

    const destination = `/topic/tracking/${trackingNumber}`;

    if (subscriptions[destination]) {
        subscriptions[destination].unsubscribe();
    }

    subscriptions[destination] = stompClient.subscribe(destination, (message) => {
        try {
            const trackingData = JSON.parse(message.body);
            callback(trackingData);
        } catch (e) {
            console.error('Failed to parse tracking data:', e);
        }
    });

    console.log(`Subscribed to ${destination}`);
    return subscriptions[destination];
};

/**
 * Unsubscribe from a topic
 */
export const unsubscribe = (destination) => {
    if (subscriptions[destination]) {
        subscriptions[destination].unsubscribe();
        delete subscriptions[destination];
    }
};

/**
 * Check if WebSocket is connected
 */
export const isConnected = () => {
    return stompClient && stompClient.connected;
};

export default {
    connectWebSocket,
    disconnectWebSocket,
    subscribeToAgentLocation,
    subscribeToParcelTracking,
    unsubscribe,
    isConnected,
};
