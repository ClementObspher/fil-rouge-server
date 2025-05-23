import multer from "multer"
import { Context, Next } from "hono"
import { Request } from "express"
import { Readable } from "stream"

const storage = multer.memoryStorage()
const multerUpload = multer({ storage })

export const uploadSingle = (fieldName: string) => {
	return async (c: Context, next: Next) => {
		try {
			const upload = multerUpload.single(fieldName)

			// Création d'une requête Express compatible avec un stream
			const req = {
				...c.req.raw,
				file: undefined,
				files: undefined,
				body: {},
				headers: {
					"content-type": c.req.raw.headers.get("content-type") || "",
					"content-length": c.req.raw.headers.get("content-length") || "",
				},
				pipe: async function (dest: any) {
					const stream = new Readable()
					const arrayBuffer = await c.req.raw.arrayBuffer()
					const buffer = Buffer.from(arrayBuffer)
					stream.push(buffer)
					stream.push(null)
					return stream.pipe(dest)
				},
				unpipe: function (dest: any) {
					// Implémentation vide car nous n'avons pas besoin de gérer le unpipe
					return this
				},
			} as unknown as Request

			const res = {} as any

			await new Promise((resolve, reject) => {
				upload(req, res, (err: any) => {
					if (err) {
						reject(err)
					} else {
						if (!req.file) {
							reject(new Error("Aucun fichier n'a été uploadé"))
							return
						}
						;(c.req as any).file = req.file
						resolve(true)
					}
				})
			})

			await next()
		} catch (error) {
			return c.json(
				{
					error: "Erreur lors de l'upload du fichier",
					details: error instanceof Error ? error.message : "Erreur inconnue",
				},
				400
			)
		}
	}
}

export default {
	single: uploadSingle,
}
