declare module "signale" {
  interface SignaleOptions {
    disabled?: boolean;
    interactive?: boolean;
    logLevel?: string;
    scope?: string;
    secrets?: string[];
    stream?: NodeJS.WriteStream;
    types?: Record<
      string,
      {
        badge: string;
        color: string;
        label: string;
        logLevel: string;
      }
    >;
  }

  class Signale {
    constructor(options?: SignaleOptions);
    disable(): void;
    enable(): void;
    isEnabled(): boolean;
    scope(...name: string[]): Signale;
    unscope(): void;
    config(config: SignaleOptions): Signale;
    addSecrets(secrets: (string | number)[]): Signale;
    clearSecrets(): Signale;
    time(label?: string): string;
    timeEnd(label?: string): { label: string; span: number };

    // Standard loggers
    success(...message: any[]): void;
    info(...message: any[]): void;
    warn(...message: any[]): void;
    error(...message: any[]): void;
    debug(...message: any[]): void;
    log(...message: any[]): void;
    complete(...message: any[]): void;
    pending(...message: any[]): void;
    start(...message: any[]): void;
    watch(...message: any[]): void;
    await(...message: any[]): void;
  }

  const signale: Signale;
  export { Signale, SignaleOptions };
  export default signale;
}
