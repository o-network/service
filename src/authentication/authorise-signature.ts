import { verifySignature, parseRequest, IncomingMessageLike, ParseRequestOptions } from "http-signature";

export type PublicKeyGetter = (identifier: string) => Promise<string>;

export async function authoriseSignature(request: IncomingMessageLike, getPublicKey: PublicKeyGetter, options?: ParseRequestOptions): Promise<boolean> {
  const parsedSignature = parseRequest(request, options);
  const publicKey = await getPublicKey(parsedSignature.keyId);
  if (!publicKey) {
    return false;
  }
  return verifySignature(parsedSignature, publicKey)
}
