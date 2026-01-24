package handlers

import (
	"database/sql"

	"ppt-terminal/internal/db"

	"github.com/gofiber/fiber/v2"
)

// HistoryHandler handles /api/v1/index/history
func HistoryHandler(database *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		country := c.Query("country")
		if country == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "country parameter is required",
			})
		}

		base := c.Query("base", "USD")

		history, err := db.GetPriceHistory(database, country, base)
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

		return c.JSON(fiber.Map{
			"country": country,
			"base":    base,
			"records": history,
			"count":   len(history),
		})
	}
}
