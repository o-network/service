import { Fetcher } from "@opennetwork/http-store";
import { Request } from "@opennetwork/http-representation";
import {
  SPARQLToQuery,
  UpdateClauses,
  NamedNode,
  graph,
  IndexedFormula,
  parse
} from "../types/rdflib";
import { createHash } from "crypto";
import { URL } from "url";

const STORAGE_QUERY = `PREFIX sp: <http://www.w3.org/ns/pim/space#> SELECT ?webid ?storage WHERE { ?webid sp:storage ?storage . }`;

type ProfileDocumentStorage = {
  "?storage": NamedNode,
  "?webid": NamedNode
} & UpdateClauses;

export const contentType = "application/ld+json";

export async function getProfileDocument(fetch: Fetcher, uri: string): Promise<string> {
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

export async function parseProfileGraph(profileDocument: string, uri: string): Promise<IndexedFormula> {
  const profileGraph = graph();

  await new Promise(
    (resolve, reject) => parse(
      profileDocument,
      profileGraph,
      uri,
      contentType,
      error => error ? reject(error) : resolve()
    )
  );

  return profileGraph;
}

export async function getProfileGraph(fetch: Fetcher, uri: string): Promise<IndexedFormula> {
  const profileDocument = await getProfileDocument(fetch, uri);
  return parseProfileGraph(profileDocument, uri);
}

function getStorageLocationForAgent(uri: string): string {
  const hash = createHash("sha256")
    .update(new URL(uri).toString())
    .digest();
  return new URL(`/storage/${hash}/`, `https://${process.env.CURRENT_HOST}`).toString();
}

async function getStorageFromProfile(profileGraph: IndexedFormula): Promise<ProfileDocumentStorage[]> {
  const publicKeys: ProfileDocumentStorage[] = [];
  const query = SPARQLToQuery(STORAGE_QUERY, undefined, profileGraph);

  await new Promise(
    (resolve, reject) => profileGraph.query(
      query,
      (result: UpdateClauses) => publicKeys.push(result as ProfileDocumentStorage),
      undefined,
      (error?: Error) => error ? reject(error) : resolve()
    )
  );

  return publicKeys;
}

export async function getStorageLocationForProfile(uri: string, profileGraph: IndexedFormula): Promise<string> {
  const storage = await getStorageFromProfile(profileGraph);

  const found = storage.find(
    value => (
      value["?webid"].termType === "NamedNode" &&
      value["?storage"].termType === "NamedNode"
    )
  );

  if (found) {
    return found["?storage"].value;
  }

  // Default to our own host
  return getStorageLocationForAgent(uri);
}
