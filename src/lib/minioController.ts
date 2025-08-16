import { Client } from "minio"
import { v4 as uuidv4 } from "uuid"

export async function uploadImage(file: Buffer, fileName: string, client: Client): Promise<string> {
	const bucketName = "images"
	const objectName = `${uuidv4()}-${fileName}`

	const bucketExists = await client.bucketExists(bucketName)
	if (!bucketExists) {
		await client.makeBucket(bucketName, "")
	}

	await client.putObject(bucketName, objectName, file)

	return `http://localhost:9000/${bucketName}/${objectName}`
}
