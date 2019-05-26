import {
  CustomAuthorizerResult,
  APIGatewayProxyResult, APIGatewayEventRequestContext
} from "aws-lambda";
import { generatePolicy } from "./generate-policy"
import { authoriseSignature } from "../../authentication/authorise-signature";
import {Headers, IncomingMessageLike, ParseRequestOptions} from "http-signature";
import fetch from "../../fetch";
import createPublicKeyGetter from "../../authentication/get-public-key";

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
  const getPublicKey = createPublicKeyGetter(fetch, profileUri);
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
  if (!await authoriseSignature(request, getPublicKey, options)) {
    throw new Error("Unauthorised");
  }
  return generatePolicy(profileUri, "Allow", event.methodArn, {
    agent: profileUri
  });
}

export async function handler(event: Event): Promise<CustomAuthorizerResult> {
  return signatureHandler(event);
}
