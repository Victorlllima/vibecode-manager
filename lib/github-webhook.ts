import crypto from 'crypto';

export async function verifySignature(
    payload: string,
    signature: string,
    secret: string
): Promise<boolean> {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from('sha256=' + hmac.update(payload).digest('hex'), 'utf8');
    const checksum = Buffer.from(signature, 'utf8');

    if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
        return false;
    }
    return true;
}
