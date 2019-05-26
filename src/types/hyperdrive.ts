declare module "hyperdrive" {

  export type HyperdriveOptions = {

  };

  export type HyperdriveStorageGetter = (name: string) => void;

  export type HyperdriveStorage = string | HyperdriveStorageGetter;

  class Hyperdrive {

    constructor(storage: HyperdriveStorage, key?: string, options?: HyperdriveOptions)

  }

  export default Hyperdrive;


}
