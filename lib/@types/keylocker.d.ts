declare namespace KeyLocker {
    export interface ClassInterface {
        encrypt(value: string, keyName: string): Promise<string>
        decrypt(value: string, keyName: string): Promise<string>
    }

    export interface DOMConfig {
        indexDB: {
            database: string
            objectStore: string
        }
        key: Exclude<Parameters<SubtleCrypto['generateKey']>[0], 'Ed25519'>
        cryptoConfig: Parameters<SubtleCrypto['encrypt']>[0]
    }

    export interface DOMApis {
        indexedDB: IDBFactory
        crypto: SubtleCrypto
    }

    export interface DOMKeyIndexedDBObj {
        id: string
        key: CryptoKeyPair
    }

    export interface DOMEncryptReturnPlain  {
        type: 'plain',
        value: string

    }

    export interface DOMEncryptReturnEncrypt {
        type: 'encrypt',
        value: string
        keyName: string
    }

    export type DOMEncryptReturn  =
        | DOMEncryptReturnPlain
        | DOMEncryptReturnEncrypt
    ;

}