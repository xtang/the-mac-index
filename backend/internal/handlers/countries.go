package handlers

import (
	"database/sql"

	"ppt-terminal/internal/db"

	"github.com/gofiber/fiber/v2"
)

// CountriesHandler handles /api/v1/countries
// Now supports ?type=bigmac|oil_brent|oil_wti|pork|eggs
func CountriesHandler(database *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get index type (default: bigmac for backward compatibility)
		indexType := c.Query("type", "bigmac")
		
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
