import {
  AuthResponseContext,
  CustomAuthorizerResult,
  APIGatewayProxyResult,
  APIGatewayEventRequestContext
} from "aws-lambda";
import { generatePolicy } from "./generate-policy"
import { authoriseSignature } from "../../authentication/authorise-signature";
import {Headers, IncomingMessageLike, ParseRequestOptions} from "http-signature";
import fetch from "../../fetch";
import { parseProfileGraph, getProfileDocument, getStorageLocationForProfile } from "../../authentication/get-profile";
import { getPublicKeyFromProfile } from "../../authentication/get-public-key";
import {IndexedFormula} from "../../types/rdflib";

type Event = {
  requestContext?: APIGatewayEventRequestContext & {
    protocol: string;
  };
  headers: Headers,
  methodArn: string
};

function getLowercaseHeaders(event: Event): Headers {
  return Object.keys(event.headers)
    .reduce(
      (map, key) => {
        map[key.toLowerCase()] = event.headers[key];
        return map;
      },
      {} as Headers
    );
}

function getProfileUri(event: Event): string {
  return event.headers["User"];
}

// authoriser doesn't allow us to return headers, so if you want to follow spec, you'll need to authorise within your functions and return
// early if not authenticated
// Not sure what the best way is
export async function initiationHandler(event: Event): Promise<APIGatewayProxyResult> {
  try {
    await handler(event);
    return undefined;
  } catch(e) {
    return {
      statusCode: 401,
      headers: {
        "WWW-Authenticate": `Signature realm="self",headers="(request-target) (created) User"`
      },
      body: undefined
    };
  }
}

async function getContextFromGraph(profileUri: string, profileDocument: string, profileGraph: IndexedFormula): Promise<AuthResponseContext> {
  return {
    agent: profileUri,
    document: profileDocument,
    storage: await getStorageLocationForProfile(profileUri, profileGraph)
  };
}

async function signatureHandler(event: Event): Promise<CustomAuthorizerResult> {
  if (!event.requestContext) {
    throw new Error("Unable to process non request");
  }
  const profileUri = getProfileUri(event);
  if (!profileUri) {
    throw new Error("Unauthorised");
  }
  const headers = getLowercaseHeaders(event);
  const request: IncomingMessageLike = {
    headers,
    url: event.requestContext.path,
    method: event.requestContext.httpMethod,
    httpVersion: event.requestContext.protocol.split("/")[1]
  };
  const profileDocument = await getProfileDocument(fetch, profileUri);
  const profileGraph = await parseProfileGraph(profileDocument, profileUri);
  const options: ParseRequestOptions = {
    headers: [
      "user" // As its what we will use for the principal identifier & to fetch the certificate
    ],
    algorithms: [
      // Only supporting rsa at this time
      "rsa-sha256",
      "rsa-sha384",
      "rsa-sha512"
    ]
  };
  if (!await authoriseSignature(request, identifier => getPublicKeyFromProfile(profileGraph, identifier), options)) {
    throw new Error("Unauthorised");
  }
  const resultContext = await getContextFromGraph(profileUri, profileDocument, profileGraph);
  return generatePolicy(profileUri, "Allow", event.methodArn, resultContext);
}

export async function handler(event: Event): Promise<CustomAuthorizerResult> {
  return signatureHandler(event);
}
