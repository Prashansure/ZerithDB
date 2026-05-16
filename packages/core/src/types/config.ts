export interface SyncConfig {
  /**
   * WebSocket URL of the ZerithDB signaling server.
   * @default "wss://signal.zerithdb.dev"
   */
  signalingUrl?: string;

  /**
   * Multiple signaling server URLs for automatic failover.
   * Tried in order — falls back to the next on failure.
   * Takes priority over signalingUrl if both are set.
   */
  signalingUrls?: string[];

  /**
   * STUN/TURN server URLs for WebRTC ICE negotiation.
   * @default Uses Google's public STUN servers
   */
  iceServers?: RTCIceServer[];

  /**
   * Maximum number of peers to connect to per room.
   * Full-mesh topology — costs O(n²) connections.
   * @default 10
   */
  maxPeers?: number;
}

export interface AuthConfig {
  /**
   * Storage key prefix for the identity keypair in localStorage.
   * @default "__zerithdb_identity"
   */
  storageKey?: string;
}

export interface NetworkConfig {
  /**
   * Whether to automatically reconnect when a peer disconnects.
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Initial backoff delay in ms for reconnection.
   * @default 1000
   */
  reconnectDelay?: number;
}

export interface ZerithDBConfig {
  /**
   * Unique identifier for this application's data namespace.
   * This scopes all IndexedDB storage and P2P rooms.
   * Must be stable — changing it is equivalent to starting fresh.
   */
  appId: string;

  sync?: SyncConfig;
  auth?: AuthConfig;
  network?: NetworkConfig;

  /**
   * Log level for internal ZerithDB diagnostics.
   * @default "warn"
   */
  logLevel?: "debug" | "info" | "warn" | "error" | "silent";
}