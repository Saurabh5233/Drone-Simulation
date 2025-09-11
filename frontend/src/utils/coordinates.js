// NYC area coordinate mappings for realistic addresses
const NYC_COORDINATES = {
  // Warehouse/Pickup locations (Lower Manhattan, Brooklyn, Queens)
  warehouses: [
    { name: "123 Warehouse St, NYC", lat: 40.7589, lng: -73.9851 }, // Times Square area
    { name: "456 Distribution Center, NYC", lat: 40.6892, lng: -74.0445 }, // Hoboken area
    { name: "789 Logistics Hub, NYC", lat: 40.7282, lng: -73.7949 }, // Queens
    { name: "321 Supply Chain Dr, NYC", lat: 40.6501, lng: -73.9496 }, // Brooklyn
    { name: "654 Fulfillment Ave, NYC", lat: 40.7614, lng: -73.9776 }, // Upper West Side
  ],
  
  // Customer/Delivery locations (Various NYC boroughs)
  customers: [
    { name: "111 Customer Ave, NYC", lat: 40.7505, lng: -73.9934 }, // Herald Square
    { name: "222 Residential St, NYC", lat: 40.7831, lng: -73.9712 }, // Upper West Side
    { name: "333 Office Plaza, NYC", lat: 40.7397, lng: -74.0025 }, // Chelsea
    { name: "444 Shopping Mall, NYC", lat: 40.7549, lng: -73.9840 }, // Theater District
    { name: "555 University Campus, NYC", lat: 40.7295, lng: -73.9965 }, // NYU area
    { name: "666 Park Avenue, NYC", lat: 40.7829, lng: -73.9654 }, // Upper East Side
    { name: "777 Brooklyn Heights, NYC", lat: 40.6962, lng: -73.9961 }, // Brooklyn Heights
    { name: "888 Astoria Blvd, NYC", lat: 40.7661, lng: -73.9197 }, // Queens
  ]
};

// Enhanced coordinate generation with real NYC locations
export const getCoordinatesFromAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return getRandomNYCCoordinates();
  }

  const addressLower = address.toLowerCase();
  
  // Check for exact matches first
  const allLocations = [...NYC_COORDINATES.warehouses, ...NYC_COORDINATES.customers];
  const exactMatch = allLocations.find(loc => loc.name.toLowerCase() === addressLower);
  if (exactMatch) {
    return { latitude: exactMatch.lat, longitude: exactMatch.lng };
  }
  
  // Pattern matching for warehouse/pickup locations
  const warehouseKeywords = ['warehouse', 'distribution', 'logistics', 'supply', 'fulfillment', 'pickup'];
  const isWarehouse = warehouseKeywords.some(keyword => addressLower.includes(keyword));
  
  if (isWarehouse) {
    const warehouse = getRandomElement(NYC_COORDINATES.warehouses);
    return {
      latitude: warehouse.lat + (Math.random() - 0.5) * 0.01, // Add small variation
      longitude: warehouse.lng + (Math.random() - 0.5) * 0.01
    };
  }
  
  // Pattern matching for customer/delivery locations
  const customerKeywords = ['customer', 'residential', 'office', 'shopping', 'university', 'park', 'delivery'];
  const isCustomer = customerKeywords.some(keyword => addressLower.includes(keyword));
  
  if (isCustomer) {
    const customer = getRandomElement(NYC_COORDINATES.customers);
    return {
      latitude: customer.lat + (Math.random() - 0.5) * 0.01, // Add small variation
      longitude: customer.lng + (Math.random() - 0.5) * 0.01
    };
  }
  
  // Default to random NYC coordinates if no pattern matches
  return getRandomNYCCoordinates();
};

// Generate random coordinates within NYC bounds
export const getRandomNYCCoordinates = () => {
  const nycBounds = {
    north: 40.9176,   // Bronx
    south: 40.4774,   // Staten Island
    east: -73.7004,   // Queens
    west: -74.2591    // Staten Island
  };
  
  const lat = nycBounds.south + Math.random() * (nycBounds.north - nycBounds.south);
  const lng = nycBounds.west + Math.random() * (nycBounds.east - nycBounds.west);
  
  return { latitude: lat, longitude: lng };
};

// Get a random element from an array
const getRandomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  
  return distance;
};

// Convert degrees to radians
const toRadians = (degrees) => {
  return degrees * (Math.PI/180);
};

// Calculate estimated flight time based on distance (assuming average drone speed)
export const calculateFlightTime = (coord1, coord2, speedKmh = 30) => {
  const distance = calculateDistance(coord1, coord2);
  const timeHours = distance / speedKmh;
  const timeMinutes = timeHours * 60;
  return Math.round(timeMinutes);
};

// Generate intermediate waypoints for smooth flight path
export const generateFlightPath = (startCoord, endCoord, numberOfPoints = 20) => {
  const waypoints = [];
  
  for (let i = 0; i <= numberOfPoints; i++) {
    const ratio = i / numberOfPoints;
    const lat = startCoord.latitude + (endCoord.latitude - startCoord.latitude) * ratio;
    const lng = startCoord.longitude + (endCoord.longitude - startCoord.longitude) * ratio;
    
    waypoints.push({
      latitude: lat,
      longitude: lng,
      progress: ratio * 100
    });
  }
  
  return waypoints;
};

// Format coordinates for display
export const formatCoordinate = (coord, precision = 4) => {
  if (typeof coord !== 'number') return 'N/A';
  return coord.toFixed(precision);
};

// Validate coordinate values
export const isValidCoordinate = (coord) => {
  if (!coord || typeof coord !== 'object') return false;
  
  const { latitude, longitude } = coord;
  
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

// Get NYC borough from coordinates (approximate)
export const getBoroughFromCoordinates = (coord) => {
  if (!isValidCoordinate(coord)) return 'Unknown';
  
  const { latitude, longitude } = coord;
  
  // Approximate borough boundaries
  if (latitude > 40.79 && longitude > -73.95) return 'Bronx';
  if (latitude < 40.65 && longitude < -74.05) return 'Staten Island';
  if (longitude > -73.83) return 'Queens';
  if (latitude < 40.73 && longitude < -73.95) return 'Brooklyn';
  return 'Manhattan';
};

// Get all predefined locations for dropdown/selection
export const getAllPredefinedLocations = () => {
  return {
    warehouses: NYC_COORDINATES.warehouses.map(loc => loc.name),
    customers: NYC_COORDINATES.customers.map(loc => loc.name),
    all: [...NYC_COORDINATES.warehouses, ...NYC_COORDINATES.customers].map(loc => loc.name)
  };
};

export default {
  getCoordinatesFromAddress,
  getRandomNYCCoordinates,
  calculateDistance,
  calculateFlightTime,
  generateFlightPath,
  formatCoordinate,
  isValidCoordinate,
  getBoroughFromCoordinates,
  getAllPredefinedLocations
};