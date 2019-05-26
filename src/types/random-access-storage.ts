import {RandomAccessStorageRequest} from "random-access-storage";

declare module "random-access-storage" {

  export type RandomAccessStorageReadCallback = (error: Error, contents?: Buffer) => void;
  export type RandomAccessStorageErrorCallback = (error?: Error) => void;

  export interface RandomAccessStorageRequest {
    storage: RandomAccessStorage;
    type: number;
    offset: number;
    size: number;
    data?: Buffer;
    callback(error: Error, value?: Buffer): void;
    _run(): void;
  }

  // Each of these functions will be invoked with `this` bound to the `RandomAccessStorage` instance
  // meaning it can be used to hold state _if needed_
  export type RandomAccessStorageOptions = {
    openReadonly?: (request: RandomAccessStorageRequest) => void;
    open?: (request: RandomAccessStorageRequest) => void;
    read?: (request: RandomAccessStorageRequest) => void;
    write?: (request: RandomAccessStorageRequest) => void;
    del?: (request: RandomAccessStorageRequest) => void;
    stat?: (request: RandomAccessStorageRequest) => void;
    close?: (request: RandomAccessStorageRequest) => void;
    destroy?: (request: RandomAccessStorageRequest) => void;
  }

  export class RandomAccessStorage {

    constructor(options: RandomAccessStorageOptions);

    open(callback?: RandomAccessStorageReadCallback): void;
    read(offset: number, size: number, callback?: RandomAccessStorageReadCallback): void;
    write(offset: number, buffer: Buffer, callback?: RandomAccessStorageErrorCallback): void;
    del(offset: number, size: Buffer, callback?: RandomAccessStorageErrorCallback): void;
    stat(callback?: RandomAccessStorageErrorCallback): void;
    close(callback?: RandomAccessStorageErrorCallback): void;
    destroy(callback?: RandomAccessStorageErrorCallback): void;
    run(request: RandomAccessStorageRequest): void;

  }

}
