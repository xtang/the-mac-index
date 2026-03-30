package handlers

import (
	"database/sql"

	"ppt-terminal/internal/db"

	"github.com/gofiber/fiber/v2"
)

// CountriesHandler handles /api/v1/countries
// Now supports ?type=bigmac|oil_brent|oil_wti|pork|eggs
// BACKWARD COMPATIBLE: Returns array if no ?type= specified, object if type specified
func CountriesHandler(database *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get index type (default: bigmac for backward compatibility)
		indexType := c.Query("type", "")
		
		// If no type specified, use bigmac and return old format (array only)
		if indexType == "" {
			indexType = "bigmac"
			countries, err := db.GetCountries(database, indexType)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to fetch countries",
				})
			}
			// OLD FORMAT: Just return the array for backward compatibility
			return c.JSON(countries)
		}
		
		// Validate index type
		if !db.IsValidIndexType(indexType) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid index type. Supported: bigmac, oil_brent, oil_wti, pork, eggs",
			})
		}
		
		countries, err := db.GetCountries(database, indexType)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch countries",
			})
		}
		
		// NEW FORMAT: Return object with metadata when type is explicitly specified
		return c.JSON(fiber.Map{
			"index_type": indexType,
			"countries":  countries,
			"count":      len(countries),
		})
	}
}

// IndicesHandler handles /api/v1/indices
// Returns metadata about all available commodity indices
func IndicesHandler(database *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		indices, err := db.GetAvailableIndices(database)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch indices",
			})
		}
		return c.JSON(fiber.Map{
			"indices": indices,
			"count":   len(indices),
		})
	}
}
