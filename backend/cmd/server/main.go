package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"

	"ppt-terminal/internal/db"
	"ppt-terminal/internal/handlers"
)

const (
	dbPath = "../data/ppt.db"
	port   = ":3000"
)

func main() {
	// Connect to DuckDB
	database, err := db.GetDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Initialize Fiber
	app := fiber.New(fiber.Config{
		AppName: "Purchasing Power Terminal v0.1.0",
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// API v1 routes
	v1 := app.Group("/api/v1")
	v1.Get("/indices", handlers.IndicesHandler(database))          // NEW: List available indices
	v1.Get("/countries", handlers.CountriesHandler(database))        // Updated: now supports ?type=
	v1.Get("/index/history", handlers.HistoryHandler(database))      // Updated: now supports ?type=
	v1.Post("/calculator/ppp", handlers.CalculatorHandler(database)) // TODO: Update for multi-index

	// Start server
	log.Printf("🚀 Purchasing Power Terminal starting on 0.0.0.0%s (Accessible on Network)", port)
	log.Fatal(app.Listen(port))
}
