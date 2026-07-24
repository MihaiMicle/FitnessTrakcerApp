# Full-Stack Fitness & Nutrition Tracker

A responsive, full-stack web application designed for precision dietary tracking. Users can log daily meals across specific categories, monitor progress toward macronutrient targets in real time, and manage their nutritional goals through a clean, dark-mode UI.

---

## Tech Stack

* **Frontend:** [Next.js](https://nextjs.org/) (App Router), React, TypeScript, Tailwind CSS
* **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python), Pydantic
* **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
* **API & Validation:** RESTful architecture with strict Pydantic schema validation and error handling

---

## Key Features

* **Daily Macro Dashboard:** Real-time visual progress bars tracking daily consumption against target goals for **Calories, Protein, Carbs, and Fats**.
* **Categorized Meal Logging:** Automatically groups logged foods into structured categories (*Breakfast, Lunch, Dinner, Snacks*) with category-level macro subtotals.
* **Instant UI Feedback:** Smooth modal-based food logging with live updates and unit conversions (grams, ounces, milliliters, etc.).
* **Robust Error Handling:** Translates backend Pydantic validation (`422 Unprocessable Entity`) errors into clean, user-friendly UI notifications.
* **Modern Dark UI:** Built with Tailwind CSS for a sleek, responsive, high-contrast dark theme optimized for desktop and mobile.
