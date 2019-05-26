import { FSStore, RemoteStore } from "@opennetwork/http-store";
import { URL } from "url";
import fetch from "./fetch";
import { Request, asBuffer } from "@opennetwork/http-representation";
import Hyperdrive from "hyperdrive";
import RandomAccessS3 from "random-access-s3";

function isCurrentHost(uri: string): boolean {
  if (!process.env.CURRENT_HOST) {
    throw new Error("CURRENT_HOST was not provided as an environment variable");
  }
  const instance = new URL(uri);
  return instance.host.toLowerCase() === process.env.CURRENT_HOST;
}

async function getRemoteStoreRequest(uri: string, request: Request): Promise<Request> {
  if (!isCurrentHost(request.url)) {
    return request;
  }
  const original = new URL(request.url);
  const updated = new URL(original.pathname, uri);
  return new Request(
    updated.toString(),
    {
      body: await asBuffer(request),
      method: request.method,
      headers: request.headers
    }
  );
}

export function getStorage(uri: string) {
  if (!isCurrentHost(uri)) {
    return new RemoteStore(async request => fetch(await getRemoteStoreRequest(uri, request)));
  }
  if (!process.env.AWS_S3_STORAGE_BUCKET) {
    throw new Error("AWS_S3_STORAGE_BUCKET was not provided as an environment variable");
  }
  const randomAccess = RandomAccessS3()
  return new FSStore({

  });
}
