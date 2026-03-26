let runtimeApiKey: string | null = null;

export const getApiKey = (): string => {
  // Try runtime store first
  if (runtimeApiKey) {
    return runtimeApiKey;
  }

  // Try sessionStorage
  try {
    const stored = sessionStorage.getItem('neurally_api_key');
    if (stored) {
      runtimeApiKey = stored;
      return stored;
    }
  } catch (e) {}

  // Try localStorage
  try {
    const stored = localStorage.getItem('neurally_api_key');
    if (stored) {
      runtimeApiKey = stored;
      return stored;
    }
  } catch (e) {}

  // Try environment variable
  const envKey = import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) {
    runtimeApiKey = envKey;
    return envKey;
  }

  return '';
};

export const setApiKey = (key: string) => {
  runtimeApiKey = key;
  try {
    sessionStorage.setItem('neurally_api_key', key);
  } catch (e) {
    console.warn('Failed to store API key in sessionStorage', e);
  }
};

export const hasApiKey = (): boolean => {
  return getApiKey().length > 0;
};

export const clearApiKey = () => {
  runtimeApiKey = null;
  try {
    sessionStorage.removeItem('neurally_api_key');
  } catch (e) {}
};
