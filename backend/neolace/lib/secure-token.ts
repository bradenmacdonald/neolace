/**
 * Create a cryptographically secure random string which can be used as an auth token.
 * 
 * Example: sJ7a9Mj5xtxmaVkCRrP7Zg7HfcQ8aIpqRChE0AqLhF2Y5DnHzlOKuZdHJofE2Msn
 */
export async function createRandomToken(bytes = 48): Promise<string> {
    const array = new Uint8Array(bytes);
    await crypto.getRandomValues(array);
    const tokenB64 = btoa(String.fromCharCode.apply(null, Array.from(array)));
    const token = tokenB64.replace(/\+/g, "a").replace(/\//g, "b").replace(/=/g, "");
    return token;
}
