package handlers

import (
	"database/sql"

	"ppt-terminal/internal/db"

	"github.com/gofiber/fiber/v2"
)

// CountriesHandler handles /api/v1/countries
func CountriesHandler(database *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		countries, err := db.GetCountries(database)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch countries",
			})
		}
		return c.JSON(countries)
	}
}
