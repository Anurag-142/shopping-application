-- Migration: add unique constraint on products.name
-- Run this on an existing database that was created before this constraint existed.
-- If you are running migrate.js from scratch it is already included in the schema.

CREATE UNIQUE INDEX IF NOT EXISTS products_name_unique
    ON products (name);
