export default function handler(
  request: { url?: string; headers: { cookie?: string } },
  response: { setHeader(name: string, value: string): void; end(body: string): void },
): void;
