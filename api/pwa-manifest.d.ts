export default function handler(
  request: { headers: { cookie?: string } },
  response: { setHeader(name: string, value: string): void; end(body: string): void },
): void;
