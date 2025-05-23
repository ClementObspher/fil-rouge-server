import { Client } from "minio"

const minioClient = new Client({
	endPoint: "localhost",
	port: 9000,
	useSSL: false,
	accessKey: process.env.MINIO_ROOT_USER || "minioadmin",
	secretKey: process.env.MINIO_ROOT_PASSWORD || "minioadmin",
})

export default minioClient
