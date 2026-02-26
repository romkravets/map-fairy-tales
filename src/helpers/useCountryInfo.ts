// useCountryInfo.ts
// Кладеш countries.json в /public/countries.json
// і використовуєш цей хук замість Firebase для інфо про країну

import { useEffect, useState } from "react";

export interface CountryMedia {
  photos: { url: string; caption: string }[];
  videos: { url: string; title: string }[];
}

export interface CountryInfo {
  capitalCity: string;
  locationAndSize: string;
  language: string;
  cultureAndTraditions: string;
  natureAndWildlife: string;
  friendlyPeople: string;
  media: CountryMedia;
}

// Один раз завантажуємо і кешуємо весь файл
let cache: Record<string, CountryInfo> | null = null;

async function loadCountries(): Promise<Record<string, CountryInfo>> {
  if (cache) return cache;
  const res = await fetch("/countries.json");
  cache = await res.json();
  return cache!;
}

export function useCountryInfo(region: string) {
  const [info, setInfo] = useState<CountryInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!region) return;
    setLoading(true);
    loadCountries()
      .then((data) => setInfo(data[region] ?? null))
      .finally(() => setLoading(false));
  }, [region]);

  return { info, loading };
}
