declare module "i18n-iso-countries" {
  export function registerLocale(data: any): void;
  export function alpha3ToAlpha2(alpha3: string): string | undefined;
  export function alpha2ToAlpha3(alpha2: string): string | undefined;
  export function getName(alpha2: string, locale: string): string | undefined;
  export function getAlpha2Code(
    name: string,
    locale: string,
  ): string | undefined;
  export const countries: Record<string, any>;
  const _default: any;
  export default _default;
}
