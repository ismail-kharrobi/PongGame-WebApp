import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import { Toaster } from 'react-hot-toast';
import { UserContextProvider } from './Context';
import { AllRouters } from './Routes/ReactTouter';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // <React.StrictMode>
    <>
      <Toaster
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        className: "relative top-[6vh] bg-base-100 text-white",
        duration: 5000
      }}
    />
    <UserContextProvider>
      <AllRouters/>
    </UserContextProvider>
    </>
  // </React.StrictMode>
);


reportWebVitals();
