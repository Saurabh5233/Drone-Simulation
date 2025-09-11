console.log('main-legacy.jsx started loading');

import React from 'react';
import ReactDOM from 'react-dom';

console.log('Legacy React and ReactDOM imported');

function App() {
  console.log('Legacy App component rendering');
  return React.createElement('div', null, 
    React.createElement('h1', null, 'Hello World - Legacy React'),
    React.createElement('p', null, 'This is using React 18 legacy render method!')
  );
}

console.log('Getting root element...');
const rootElement = document.getElementById('root');

if (rootElement) {
  console.log('Root element found, rendering with legacy method...');
  ReactDOM.render(React.createElement(App), rootElement);
  console.log('Legacy render complete');
} else {
  console.error('Root element not found!');
}
