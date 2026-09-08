export interface ApiKeys {
  esvApiKey: string;
  scriptureApiKey: string;
}

export function getDefaultApiKeys(): ApiKeys {
  if (import.meta.env.VITE_PUBLIC_BUILD === '1') {
    return { esvApiKey: '', scriptureApiKey: '' };
  }
  return {
    esvApiKey: import.meta.env.VITE_ESV_API_KEY || '',
    scriptureApiKey: import.meta.env.VITE_SCRIPTURE_API_KEY || '',
  };
}
