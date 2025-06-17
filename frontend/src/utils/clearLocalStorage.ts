// Utility to clear localStorage if data format changes
export const clearOutdatedLocalStorage = () => {
  try {
    const storedState = localStorage.getItem('wage-growth-state');
    if (storedState) {
      const parsed = JSON.parse(storedState);
      
      // Check if we have old Date objects (they would be stored as strings like "2024-01-01T00:00:00.000Z")
      // but when parsed back, they're still strings. However, if the app was trying to use them as Date objects
      // it would have caused serialization errors.
      
      // Clear if we detect any issues or just to be safe for this update
      if (parsed.wageEntries?.entries?.length > 0) {
        const firstEntry = parsed.wageEntries.entries[0];
        // If the date field exists and looks like it might have issues, clear it
        if (firstEntry.date && typeof firstEntry.date === 'object') {
          console.log('Clearing outdated localStorage format');
          localStorage.removeItem('wage-growth-state');
          return true;
        }
      }
    }
  } catch (error) {
    console.error('Error checking localStorage:', error);
    // If there's any error parsing, clear it
    localStorage.removeItem('wage-growth-state');
    return true;
  }
  
  return false;
};

// Run this once on app load
if (typeof window !== 'undefined') {
  clearOutdatedLocalStorage();
}