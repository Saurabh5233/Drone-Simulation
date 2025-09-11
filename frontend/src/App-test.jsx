// Simple test version of App.jsx
import React from 'react';

function App() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1>Drone Simulator - Test Version</h1>
      <p>If you can see this, React is working correctly!</p>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: 'white', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>Backend Connection Test</h2>
        <button 
          onClick={async () => {
            try {
              const response = await fetch('http://localhost:3003/health');
              const data = await response.json();
              alert('Data Provider: ' + JSON.stringify(data));
            } catch (error) {
              alert('Error connecting to Data Provider: ' + error.message);
            }
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test Data Provider (Port 3003)
        </button>
        
        <button 
          onClick={async () => {
            try {
              const response = await fetch('http://localhost:3001/health');
              const data = await response.json();
              alert('Location Receiver: ' + JSON.stringify(data));
            } catch (error) {
              alert('Error connecting to Location Receiver: ' + error.message);
            }
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Location Receiver (Port 3001)
        </button>
      </div>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: 'white', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>Simulation Data Test</h2>
        <button 
          onClick={async () => {
            try {
              const response = await fetch('http://localhost:3003/api/simulation');
              const data = await response.json();
              console.log('Simulation data:', data);
              alert('Simulation data received! Check console for details.');
            } catch (error) {
              alert('Error getting simulation data: ' + error.message);
            }
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Simulation API
        </button>
      </div>
    </div>
  );
}

export default App;
