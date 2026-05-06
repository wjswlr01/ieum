-- Step 1: Add new values to the existing enum (non-destructive)
ALTER TYPE "NodeType" ADD VALUE IF NOT EXISTS 'MASH_BEER';
ALTER TYPE "NodeType" ADD VALUE IF NOT EXISTS 'BOIL';

-- Step 2: Migrate RecipeNode rows to new values
UPDATE "RecipeNode" SET "nodeType" = 'MASH_BEER' WHERE "nodeType" = 'MASHING';
UPDATE "RecipeNode" SET "nodeType" = 'BOIL'      WHERE "nodeType" = 'BOILING';
UPDATE "RecipeNode" SET "nodeType" = 'CUSTOM'    WHERE "nodeType" IN ('LAUTERING', 'COOLING', 'FILTERING');

-- Step 3: Migrate StepTypeCatalog (has @unique on nodeType)
DELETE FROM "StepTypeCatalog" WHERE "nodeType" IN ('MASHING', 'LAUTERING', 'BOILING', 'COOLING', 'FILTERING');
