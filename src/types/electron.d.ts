export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      isDesktop: boolean;

      // Python
      detectPython: () => Promise<{
        installed: boolean; version: string | null; path: string | null;
        pipPackages: string[];
      }>;
      installPython: () => Promise<{ ok: boolean; log: string[] }>;
      installPipPackages: (toolSlug: string) => Promise<{ ok: boolean; log: string[] }>;

      // Services
      getServiceDefs: () => Promise<Array<{
        id: string; name: string; port: number; repoUrl: string;
      }>>;
      getServiceStatus: () => Promise<Array<{
        id: string; name: string; port: number;
        status: "stopped" | "starting" | "running" | "error";
      }>>;
      startService: (id: string) => Promise<{
        ok: boolean; port: number; error?: string; log: string[];
      }>;
      stopService: (id: string) => Promise<boolean>;

      // Misc
      getModelPath: (relativePath: string) => string;
      readModelFile: (relativePath: string) => Promise<ArrayBuffer>;
      getAppVersion: () => Promise<string>;
      getPlatform: () => string;
      openExternal: (url: string) => void;
    };
  }
}
