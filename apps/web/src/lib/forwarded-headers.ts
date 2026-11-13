// Repassa o IP real do cliente para que o limite de requisições da API não seja compartilhado entre todos os usuários.
export function forwardedHeaders(request: Request): Record<string, string> {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return clientIp ? { 'Content-Type': 'application/json', 'X-Forwarded-For': clientIp } : { 'Content-Type': 'application/json' };
}
