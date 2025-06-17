import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
        </CPIDataProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;