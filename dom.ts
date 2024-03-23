import * as Types from './types'

interface DOMConfig {
    indexDB: {
        database: string
        objectStore: string
    }
    key: Exclude<Parameters<SubtleCrypto['generateKey']>[0], 'Ed25519'>
    cryptoConfig: Parameters<SubtleCrypto['encrypt']>[0]
}

interface DOMApis {
    indexedDB: IDBFactory
    crypto: SubtleCrypto
}

interface DOMKeyIndexedDBObj {
    id: string
    key: CryptoKeyPair
}

export class DOMKeyLocker {
    public readonly config: DOMConfig

    constructor(config: DOMConfig) {
        this.config = config
    }

    public getDomApis(): DOMApis | undefined {
        const indexedDB = window.indexedDB

        if (indexedDB === undefined) return

        const crypto = window.crypto?.subtle

        if (crypto === undefined) return

        return {
            indexedDB,
            crypto
        }
    }

    public buf2hex(buffer: ArrayBuffer): string {
        return [...new Uint8Array(buffer)]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')
            
    }

    public hex2buf(hex: string): ArrayBuffer {
        if (hex.length % 2 !== 0) {
            throw new Error('A string hexadecimal deve ter um número par de caracteres')
        }

        const buffer = new ArrayBuffer(hex.length / 2)
        const view = new Uint8Array(buffer)

        for (var i = 0; i < hex.length; i += 2) {
            view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
        }

        return buffer
    }

    public callDB(indexedDB: IDBFactory, call: (store: IDBObjectStore) => Promise<any>): Promise<true> {
        return new Promise(resolve => {
            const db = indexedDB.open(this.config.indexDB.database, 1)
            db.onupgradeneeded = (ev) => {
                const currentVersion = ev.oldVersion

                for (let i = currentVersion; i < (ev.newVersion ?? 1); i++) {
                    if (i < 1) {
                        db.result.createObjectStore(this.config.indexDB.objectStore, { keyPath: "uuid" })
                    }
                }
            }

            db.onsuccess = async () => {
                const tx = db.result.transaction(this.config.indexDB.database, 'readwrite')
                const store = tx.objectStore(this.config.indexDB.objectStore)

                await call(store)

                tx.oncomplete = () => {
                    db.result.close()
                    return resolve(true)
                }
            }

        })
    }

    public async getOrCreateKey(apis: DOMApis, keyName: string): Promise<CryptoKeyPair> {
        const key: [CryptoKeyPair | undefined] = [undefined]

        await this.callDB(apis.indexedDB, async store => {
            const query: IDBRequest<DOMKeyIndexedDBObj> = store.get(keyName)
            query.onsuccess = () => {
                key[0] = query.result?.key
            }
        })

        if (key[0] !== undefined) {
            return key[0]
        }

        key[0] = await apis.crypto.generateKey(this.config.key, false, ['encrypt', 'decrypt']) as CryptoKeyPair

        await this.callDB(apis.indexedDB, async store => store.add({
            id: keyName,
            key: key[0] as CryptoKeyPair
        } satisfies DOMKeyIndexedDBObj))

        return key[0]
    }

    public async encrypt(value: string, keyName: string): Promise<string> {
        const apis = this.getDomApis()

        if (apis === undefined)
            return value
                

        const key = await this.getOrCreateKey(apis, keyName)

        const encrypt = await apis.crypto.encrypt(
            this.config.cryptoConfig ?? this.config.key,
            key.publicKey,
            new TextEncoder().encode(value)
        )

        return JSON.stringify({
            type: 'encrypt',
            keyName,
            value: this.buf2hex(encrypt)
        } satisfies Types.EncryptReturn)
    }

    public async tryReadJson(value: string): Promise<Partial<Types.EncryptReturn>> {
        return JSON.parse(value)
    }

    public async decrypt(value: string, keyName: string): Promise<string> {
        const result = await this.tryReadJson(value).catch(err => ({ type: 'error', msg: err }) as const)

        switch (result.type) {
            case 'encrypt': {
                const apis = this.getDomApis()

                if (apis === undefined) {
                    return value
                }

                const key = await this.getOrCreateKey(apis, keyName)

                const decrypt = await apis.crypto.decrypt(
                    this.config.cryptoConfig ?? this.config.key,
                    key.privateKey,
                    this.hex2buf(result.value ?? '')
                )

                return new TextDecoder().decode(decrypt)
            }

            case 'plain': {
                return result.value ?? ''
            }

            default: {
                console.error(result)
                return value
            }
        }
    }



}