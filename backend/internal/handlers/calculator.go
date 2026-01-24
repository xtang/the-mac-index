package handlers

import (
	"database/sql"

	"ppt-terminal/internal/db"

	"github.com/gofiber/fiber/v2"
)

// CalculatorHandler handles POST /api/v1/calculator/ppp
func CalculatorHandler(database *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req db.PPPRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
			})
		}

		// Validate required fields
		if req.Currency == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "currency is required",
			})
		}
		if req.Year == 0 || req.TargetYear == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "year and target_year are required",
			})
		}
		if req.Amount <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "amount must be positive",
			})
		}

		result, err := db.CalculatePPP(database, req)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(result)
	}
}
