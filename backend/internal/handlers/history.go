package handlers

import (
	"database/sql"

	"ppt-terminal/internal/db"

	"github.com/gofiber/fiber/v2"
)

// HistoryHandler handles /api/v1/index/history
// Now supports ?type=bigmac|oil_brent|oil_wti|pork|eggs
// BACKWARD COMPATIBLE: Omits index_type field if not explicitly requested
func HistoryHandler(database *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get index type (default: bigmac for backward compatibility)
		indexType := c.Query("type", "")
		explicitType := indexType != "" // Track if type was explicitly specified
		
		if indexType == "" {
			indexType = "bigmac" // Default
		}
		
		// Validate index type
		if !db.IsValidIndexType(indexType) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid index type. Supported: bigmac, oil_brent, oil_wti, pork, eggs",
			})
		}
		
		country := c.Query("country")
		if country == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "country parameter is required",
			})
		}

		base := c.Query("base", "USD")

		history, err := db.GetPriceHistory(database, indexType, country, base)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch history",
			})
		}

		if len(history) == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "No data found for country: " + country,
			})
		}

		// Backward compatible: only include index_type if explicitly requested
		if explicitType {
			return c.JSON(fiber.Map{
				"index_type": indexType,
				"country":    country,
				"base":       base,
				"records":    history,
				"count":      len(history),
			})
		}
		
		// OLD FORMAT: For backward compatibility
		return c.JSON(fiber.Map{
			"country": country,
			"base":    base,
			"records": history,
			"count":   len(history),
		})
	}
}
