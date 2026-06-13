class WebSocketService {
  connect(): void {
    // WebSocket removed — using REST API instead
  }

  disconnect(): void {
    // WebSocket removed — using REST API instead
  }

  sendPing(): void {
    // No-op
  }

  onMessage(): () => void {
    return () => {};
  }

  onStatusChange(): () => void {
    return () => {};
  }

  isConnectedNow(): boolean {
    return false;
  }
}

export const wsService = new WebSocketService();
export default WebSocketService;
