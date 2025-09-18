const API_BASE_URL_PROVIDER = import.meta.env.VITE_API_BASE_URL_PROVIDER || 'http://localhost:3003/api';
const API_BASE_URL_RECEIVER = import.meta.env.VITE_API_BASE_URL_RECEIVER || 'http://localhost:3001/api';

// Simulation API (Data Provider Server)
export const simulationAPI = {
  // Get current simulation data
  getSimulation: async () => {
    try {
      const response = await fetch(`${API_BASE_URL_PROVIDER}/simulation`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching simulation data:', error);
      throw error;
    }
  },
  
  // Start new simulation
  startSimulation: async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL_PROVIDER}/simulation/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error starting simulation:', error);
      throw error;
    }
  },
  
  // Start simulation for a specific orderId
  startSimulationForOrder: async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL_PROVIDER}/simulation/${orderId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error starting simulation for order ${orderId}:`, error);
      throw error;
    }
  },

  // Get active simulations
  getActiveSimulations: async () => {
    try {
      const response = await fetch(`${API_BASE_URL_PROVIDER}/simulations/active`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching active simulations:', error);
      throw error;
    }
  },
  
  // Push simulation data (trigger data generation)
  pushSimulationData: async () => {
    try {
      const response = await fetch(`${API_BASE_URL_PROVIDER}/simulation/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error pushing simulation data:', error);
      throw error;
    }
  }
};

// Drone Location API (Location Receiver Server)
export const droneAPI = {
  // Send location update
  updateLocation: async (locationData) => {
    try {
      const response = await fetch(`${API_BASE_URL_RECEIVER}/drones/location`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...locationData,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating drone location:', error);
      throw error;
    }
  },
  
  // Get drone location history
  getDroneLocations: async (serialNumber, limit = 100) => {
    try {
      const response = await fetch(`${API_BASE_URL_RECEIVER}/drones/location/${serialNumber}?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching drone locations:', error);
      throw error;
    }
  },
  
  // Get active drones
  getActiveDrones: async () => {
    try {
      const response = await fetch(`${API_BASE_URL_RECEIVER}/drones/active`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching active drones:', error);
      throw error;
    }
  },
  
  // Get drone statistics
  getStats: async () => {
    try {
      const response = await fetch(`${API_BASE_URL_RECEIVER}/drones/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching drone stats:', error);
      throw error;
    }
  }
};

// Health check utilities
export const healthAPI = {
  checkDataProvider: async () => {
    const url = (import.meta.env.VITE_API_BASE_URL_PROVIDER || 'http://localhost:3003').replace('/api', '');
    try {
      const response = await fetch(`${url}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  },
  
  checkLocationReceiver: async () => {
    const url = (import.meta.env.VITE_API_BASE_URL_RECEIVER || 'http://localhost:3001').replace('/api', '');
    try {
      const response = await fetch(`${url}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }
};

// Error handling utility
export const handleAPIError = (error) => {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'Network error: Please check if the server is running';
  }
  return error.message || 'An unexpected error occurred';
};