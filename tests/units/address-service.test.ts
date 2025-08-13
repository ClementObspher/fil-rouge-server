import { describe, it, expect, beforeEach } from "vitest"
import { AddressService } from "../../src/services/AddressService"
import { testPrisma } from "../setup"

describe("AddressService", () => {
	let addressService: AddressService

	beforeEach(() => {
		addressService = new AddressService(testPrisma)
	})

	describe("findById", () => {
		it("devrait retourner une adresse existante", async () => {
			// Créer une adresse de test
			const testAddress = await testPrisma.address.create({
				data: {
					street: "123 Test Street",
					city: "Test City",
					postal_code: "12345",
					country: "France",
				},
			})

			const result = await addressService.findById(testAddress.id)

			expect(result).toBeDefined()
			expect(result?.id).toBe(testAddress.id)
			expect(result?.street).toBe("123 Test Street")
			expect(result?.city).toBe("Test City")
		})

		it("devrait retourner null pour une adresse inexistante", async () => {
			const result = await addressService.findById("non-existent-id")

			expect(result).toBeNull()
		})
	})

	describe("create", () => {
		it("devrait créer une nouvelle adresse", async () => {
			const addressData = {
				street: "456 New Street",
				city: "New City",
				postal_code: "54321",
				country: "France",
				number: "123",
				latitude: 123,
				longitude: 123,
			}

			const result = await addressService.create(addressData)

			expect(result).toBeDefined()
			expect(result.id).toBeDefined()
			expect(result.street).toBe(addressData.street)
			expect(result.city).toBe(addressData.city)
			expect(result.postal_code).toBe(addressData.postal_code)
			expect(result.country).toBe(addressData.country)
			expect(result.createdAt).toBeDefined()
			expect(result.updatedAt).toBeDefined()
		})

		it("devrait gérer les erreurs de création", async () => {
			const invalidAddressData = {
				city: "Test City",
				postal_code: "12345",
				country: "France",
				number: "123",
				latitude: 123,
				longitude: 123,
			}

			await expect(addressService.create(invalidAddressData as any)).rejects.toThrow()
		})
	})
})
