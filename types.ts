export interface EncryptReturnPlain  {
    type: 'plain',
    value: string

}

export interface EncryptReturnEncrypt {
    type: 'encrypt',
    value: string
    keyName: string
}

export type EncryptReturn  =
    | EncryptReturnPlain
    | EncryptReturnEncrypt
;