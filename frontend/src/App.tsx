import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { ThemeProvider } from './contexts/ThemeContext';
import { CPIDataProvider } from './components/providers/CPIDataProvider';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { SharedResultsPage } from './pages/SharedResultsPage';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <CPIDataProvider>
          <Router>
            <MainLayout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/shared/:encodedData" element={<SharedResultsPage />} />
              </Routes>
            </MainLayout>
          </Router>
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                backdropFilter: 'blur(10px)',
              },
              success: {
                iconTheme: {
                  primary: 'var(--accent)',
                  secondary: 'var(--surface)',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: 'var(--surface)',
                },
              },
            }}
          />
        </CPIDataProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;