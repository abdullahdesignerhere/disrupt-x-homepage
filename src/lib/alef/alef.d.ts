export {};
declare global {
  interface Window {
    AlefApp?: {
      mount(el: HTMLElement, opts?: { view?: string; onView?: (v: string) => void }): AlefInstance;
      views: string[];
    };
  }
  interface AlefInstance {
    setView(view: string): void;
    getView(): string;
    fit(): void;
    destroy(): void;
  }
}
