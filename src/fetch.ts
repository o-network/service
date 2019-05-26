import { Request, Response, Headers, asBuffer } from "@opennetwork/http-representation";
import fetch, { HeadersInit } from "node-fetch";

function getAll(headers: Headers, key: string): string {
  if (headers.getAll) {
    return headers.getAll(key).join(",");
  }
  return headers.get(key);
}

function getHeaders(headers: Headers): HeadersInit {
  const result: { [key: string]: string } = {};
  Array.from(headers.keys())
    .forEach(key => result[key] = getAll(headers, key));
  return result;
}

export default async function(request: Request): Promise<Response> {
  const response = await fetch(request.url, {
    body: await asBuffer(request),
    method: request.method,
    headers: getHeaders(request.headers)
  });
  return new Response(
    await asBuffer(response),
    {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText
    }
  );
}
