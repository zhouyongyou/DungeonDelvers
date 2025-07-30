// Pitch page access management
// This generates a random path that you can share with BNB Chain officials

const PITCH_ROUTE_KEY = 'dd_pitch_route';
const PITCH_ROUTE_EXPIRY_KEY = 'dd_pitch_route_expiry';

// Generate a random string for the pitch route
export function generatePitchRoute(): string {
  const randomString = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString(36).substring(-4);
  return `pitch-${randomString}-${timestamp}`;
}

// Store the current pitch route
export function setPitchRoute(route: string, expiryHours: number = 72): void {
  localStorage.setItem(PITCH_ROUTE_KEY, route);
  const expiryTime = Date.now() + (expiryHours * 60 * 60 * 1000);
  localStorage.setItem(PITCH_ROUTE_EXPIRY_KEY, expiryTime.toString());
}

// Get the current valid pitch route
export function getValidPitchRoute(): string | null {
  const route = localStorage.getItem(PITCH_ROUTE_KEY);
  const expiry = localStorage.getItem(PITCH_ROUTE_EXPIRY_KEY);
  
  if (!route || !expiry) {
    return null;
  }
  
  const expiryTime = parseInt(expiry, 10);
  if (Date.now() > expiryTime) {
    // Route expired, clear it
    localStorage.removeItem(PITCH_ROUTE_KEY);
    localStorage.removeItem(PITCH_ROUTE_EXPIRY_KEY);
    return null;
  }
  
  return route;
}

// Check if a given path matches the valid pitch route
export function isValidPitchPath(path: string): boolean {
  // Allow direct access to /pitch path
  if (path === 'pitch') {
    return true;
  }
  
  // Check for special pitch routes
  const validRoute = getValidPitchRoute();
  return validRoute !== null && path === validRoute;
}

// Generate a shareable URL for the pitch page
export function generatePitchUrl(): string {
  let route = getValidPitchRoute();
  
  if (!route) {
    // Generate new route if none exists or expired
    route = generatePitchRoute();
    setPitchRoute(route);
  }
  
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#/${route}`;
}

// Admin function to regenerate the pitch route
export function regeneratePitchRoute(expiryHours: number = 72): string {
  const newRoute = generatePitchRoute();
  setPitchRoute(newRoute, expiryHours);
  return generatePitchUrl();
}