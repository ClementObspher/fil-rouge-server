import minioClient from "./minioClient"
import { v4 as uuidv4 } from "uuid"

export async function uploadImage(file: Buffer, fileName: string): Promise<string> {
	const bucketName = "images"
	const objectName = `${uuidv4()}-${fileName}`

	// Assurez-vous que le bucket existe
	const bucketExists = await minioClient.bucketExists(bucketName)
	if (!bucketExists) {
		await minioClient.makeBucket(bucketName, "")
	}

	await minioClient.putObject(bucketName, objectName, file)

	return `http://localhost:9000/${bucketName}/${objectName}`
}
