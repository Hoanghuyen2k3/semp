// Type declarations for Supabase Edge Function (Deno runtime).
// The import uses a URL; TypeScript in the IDE does not resolve URLs, so we declare the module and Deno here.

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(
    url: string,
    key: string
  ): {
    from: (table: string) => {
      insert: (row: unknown) => Promise<{ error: { message: string } | null }>;
    };
  };
}

declare global {
  const Deno: {
    serve: (handler: (req: Request) => Response | Promise<Response>) => void;
    env: { get: (key: string) => string | undefined };
  };
}

export {};
