import { PublicKeyGetter } from "./authorise-signature";
import { Fetcher } from "@opennetwork/http-store";
import { Request } from "@opennetwork/http-representation";
import { SPARQLToQuery, graph, parse, UpdateClauses, Literal, BlankNode, NamedNode } from "rdflib";
import RSA from "node-rsa";

const SPARQL_QUERY = `PREFIX cert: <http://www.w3.org/ns/auth/cert#> SELECT ?webid ?m ?e WHERE { ?webid cert:key ?key . ?key cert:modulus ?m . ?key cert:exponent ?e . }`;

const contentType = "application/ld+json";

async function getProfileDocument(fetch: Fetcher, uri: string): Promise<string> {
  const response = await fetch(
    new Request(
      uri,
      {
        method: "GET",
        headers: {
          Accept: contentType
        }
      }
    )
  )
    .catch((): undefined => undefined);
  if (!(response || response.ok)) {
    return undefined;
  }
  return response.text();
}

type ProfileDocumentPublicKey = {
  "?e": Literal,
  "?m": Literal,
  "?key": BlankNode | NamedNode,
  "?webid": BlankNode | NamedNode
} & UpdateClauses;

async function getPublicKeysFromProfile(uri: string, profileDocument: string): Promise<ProfileDocumentPublicKey[]> {
  const profileGraph = graph();

  const success = await new Promise(
    resolve => parse(
      profileDocument,
      profileGraph,
      uri,
      contentType,
      error => resolve(!error)
    )
  );

  if (!success) {
    return undefined;
  }

  const publicKeys: ProfileDocumentPublicKey[] = [];
  const query = SPARQLToQuery(SPARQL_QUERY, undefined, profileGraph);

  await new Promise(
    (resolve, reject) => profileGraph.query(
      query,
      (result: UpdateClauses) => publicKeys.push(result as ProfileDocumentPublicKey),
      undefined,
      (error?: Error) => error ? reject(error) : resolve()
    )
  );

  return publicKeys;
}

async function getPublicKeyFromProfile(uri: string, profileDocument: string, keyId: string): Promise<ProfileDocumentPublicKey> {
  const publicKeys = await getPublicKeysFromProfile(uri, profileDocument);
  return publicKeys.find(
    publicKey => !!(
      publicKey["?webid"].termType === "NamedNode" &&
      publicKey["?key"].termType === "NamedNode" &&
      publicKey["?key"].value === keyId &&
      publicKey["?e"].termType === "Literal" &&
      publicKey["?m"].termType === "Literal"
    )
  );
}

export async function getPublicKey(fetch: Fetcher, uri: string, keyId: string): Promise<string> {
  const profileDocument = await getProfileDocument(fetch, uri);
  const publicKey = await getPublicKeyFromProfile(uri, profileDocument, keyId);
  if (!publicKey) {
    return undefined;
  }
  const key = new RSA();
  key.importKey({
    n: Buffer.from(publicKey["?m"].value, "hex"),
    e: parseInt(publicKey["?e"].value)
  });
  return key.exportKey("public");
}

export default function(fetch: Fetcher, uri: string): PublicKeyGetter {
  return keyId => getPublicKey(fetch, uri, keyId);
}
