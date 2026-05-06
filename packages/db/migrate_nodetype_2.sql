UPDATE "RecipeNode" SET "nodeType" = 'MASH_BEER' WHERE "nodeType" = 'MASHING';
UPDATE "RecipeNode" SET "nodeType" = 'BOIL'      WHERE "nodeType" = 'BOILING';
UPDATE "RecipeNode" SET "nodeType" = 'CUSTOM'    WHERE "nodeType" IN ('LAUTERING', 'COOLING', 'FILTERING');
DELETE FROM "StepTypeCatalog" WHERE "nodeType" IN ('MASHING', 'LAUTERING', 'BOILING', 'COOLING', 'FILTERING');
