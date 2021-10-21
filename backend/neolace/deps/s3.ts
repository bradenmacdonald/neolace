// unfortunately this seems like a rather large dependency, but there aren't many Deno S3 clients.
// https://deno.land/x/s3@0.4.1 doesn't seem to work with Backblaze B2 and has a GPL dependency (aws_sign_v4)
export { S3Client, PutObjectCommand } from "https://deno.land/x/aws_sdk@v3.23.0-1/client-s3/mod.ts";
