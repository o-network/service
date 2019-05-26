import { SPARQLToQuery, UpdateClauses, Literal, BlankNode, NamedNode, IndexedFormula } from "rdflib";
import RSA from "node-rsa";

const SPARQL_QUERY = `PREFIX cert: <http://www.w3.org/ns/auth/cert#> SELECT ?webid ?m ?e WHERE { ?webid cert:key ?key . ?key cert:modulus ?m . ?key cert:exponent ?e . }`;

type ProfileDocumentPublicKey = {
  "?e": Literal,
  "?m": Literal,
  "?key": BlankNode | NamedNode,
  "?webid": BlankNode | NamedNode
} & UpdateClauses;

async function getPublicKeysFromProfile(profileGraph: IndexedFormula): Promise<ProfileDocumentPublicKey[]> {
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

async function getMatchingPublicKeyFromProfile(profileGraph: IndexedFormula, keyId: string): Promise<ProfileDocumentPublicKey> {
  const publicKeys = await getPublicKeysFromProfile(profileGraph);
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

export async function getPublicKeyFromProfile(profileGraph: IndexedFormula, keyId: string): Promise<string> {
  const publicKey = await getMatchingPublicKeyFromProfile(profileGraph, keyId);
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
