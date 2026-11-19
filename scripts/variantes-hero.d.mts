// Tipos del generador de variantes (scripts/variantes-hero.mjs), que las
// páginas importan para calcular su srcset con el mismo convenio de nombres.
export declare const ANCHOS: readonly number[];
export declare function varianteDe(ruta: string, ancho: number): string;
export declare function srcsetDe(ruta: string): string | undefined;
export declare function generarVariantesHero(): Promise<void>;
