import { Hono } from "hono"

const openapi = new Hono()

openapi.get("/openapi.json", (c) => {
	return c.json({
		openapi: "3.0.0",
		info: {
			title: "API",
			version: "1.0.0",
		},
	})
})

export default openapi
