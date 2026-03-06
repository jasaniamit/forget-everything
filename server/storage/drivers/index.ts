import { LocalDriver, IStorageDriver } from '../local';

const driverType = process.env.STORAGE_DRIVER || 'local';

let storageDriver: IStorageDriver;

switch (driverType) {
  case 'local':
  default:
    storageDriver = new LocalDriver();
    break;
}

export { storageDriver };
