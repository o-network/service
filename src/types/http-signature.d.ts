declare module "http-signature" {

  export type Headers = {
    [key: string]: string
  };

  export type IncomingMessageLike = {
    headers: Headers;
    method: string;
    url: string;
    httpVersion: string;
  };

  export type ParseRequestOptions = {
    headers?: string[];
    clockSkew?: number;
    authorizationHeaderName?: string;
    strict?: boolean;
    algorithms?: string[];
  };

  export type ParsedSignatureParams = {
    headers: string[];
    keyId: string;
    algorithm: string;
    signature: string;
  };

  export type ParsedSignature = {
    scheme: string;
    params: ParsedSignatureParams;
    signingString: string;
    algorithm: string;
    keyId: string;
  };

  export function parseRequest(request: IncomingMessageLike, options?: ParseRequestOptions): ParsedSignature;
  export function verifySignature(parsedSignature: ParsedSignature, publicKey: string): boolean;

}
