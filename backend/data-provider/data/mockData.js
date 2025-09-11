const { v4: uuidv4 } = require('uuid');

const droneModels = [
  'DJI Phantom 4',
  'DJI Mavic Air 2',
  'Autel EVO II',
  'Parrot Anafi',
  'Skydio 2+'
];

const customerNames = [
  'John Doe', 'Jane Smith', 'Michael Johnson', 'Emily Davis',
  'David Wilson', 'Sarah Brown', 'Chris Taylor', 'Lisa Anderson'
];

const pickupAddresses = [
  '123 Warehouse St, NYC',
  '456 Distribution Center, NYC',
  '789 Logistics Hub, NYC',
  '321 Supply Chain Dr, NYC',
  '654 Fulfillment Ave, NYC'
];

const deliveryAddresses = [
  '111 Customer Ave, NYC',
  '222 Residential St, NYC',
  '333 Office Plaza, NYC',
  '444 Shopping Mall, NYC',
  '555 University Campus, NYC'
];

const items = [
  { name: 'Electronics Package', weight: 2.5 },
  { name: 'Medical Supplies', weight: 1.8 },
  { name: 'Documents Envelope', weight: 0.3 },
  { name: 'Food Delivery', weight: 3.2 },
  { name: 'Pharmaceutical Order', weight: 1.1 },
  { name: 'Emergency Kit', weight: 4.5 },
  { name: 'Books Package', weight: 2.8 }
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateDroneData() {
  const serialNumber = `DH${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  return {
    _id: uuidv4(),
    name: `Drone ${serialNumber.slice(-4)}`,
    model: getRandomElement(droneModels),
    serialNumber,
    batteryCapacity: Math.floor(Math.random() * 20) + 80, // 80-100%
    weightLimit: Math.floor(Math.random() * 5) + 8, // 8-12 kg
    status: 'delivering',
    latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
    longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0
  };
}

function generateOrderData(customData = {}) {
  const selectedItem = getRandomElement(items);
  const quantity = Math.floor(Math.random() * 3) + 1;
  
  return {
    _id: uuidv4(),
    customerName: customData.customerName || getRandomElement(customerNames),
    customerEmail: customData.customerEmail || `${getRandomElement(customerNames).toLowerCase().replace(' ', '.')}@example.com`,
    items: customData.items || [{
      name: selectedItem.name,
      quantity,
      _id: uuidv4()
    }],
    totalWeight: customData.totalWeight || (selectedItem.weight * quantity),
    pickupAddress: customData.pickupAddress || getRandomElement(pickupAddresses),
    deliveryAddress: customData.deliveryAddress || getRandomElement(deliveryAddresses),
    status: 'assigned',
    assignedDrone: null, // Will be set below
    statusHistory: [
      {
        status: 'pending',
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        _id: uuidv4()
      },
      {
        status: 'assigned',
        timestamp: new Date().toISOString(),
        _id: uuidv4()
      }
    ],
    createdAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0
  };
}

async function generateSimulationData(customData = {}) {
  const drone = generateDroneData();
  const order = generateOrderData(customData);
  
  // Assign drone to order
  order.assignedDrone = drone._id;
  
  return {
    drone,
    order,
    timestamp: new Date().toISOString(),
    simulationId: uuidv4()
  };
}

module.exports = {
  generateSimulationData,
  generateDroneData,
  generateOrderData
};