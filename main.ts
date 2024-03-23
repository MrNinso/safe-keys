import { DOMKeyLocker } from "./dom"

// Create a key locker
const keylocker = new DOMKeyLocker({
    indexDB: {
        database: 'MyLocker',
        objectStore: 'MyKeys',
    },
    cryptoConfig:{
        name: "RSA-OAEP"
    },
    key: {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: { name: "SHA-256" },
    }
})

const token = 'SuperSecretToken'
const keyName = 'MyKeyForTokens'

const encrypt = await keylocker.encrypt(token, keyName)
localStorage.setItem('TOKEN', encrypt)

const localStorageToken = localStorage.getItem('TOKEN')

if (localStorageToken !== null) {
    console.log(await keylocker.decrypt(localStorageToken, keyName)) // SuperSecretToken
}
