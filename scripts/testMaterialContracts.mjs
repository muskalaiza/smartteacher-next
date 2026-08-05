import assert from "node:assert/strict";

import {
  getMaterialContentSchemaVersion,
  isKnownMaterialType,
  isMaterialContentSchemaVersionSupported,
  isMaterialGenerationEnabled,
  normalizeMaterialType,
} from "../lib/generation/materialContracts.js";

assert.equal(
  normalizeMaterialType("  Karta Pracy  "),
  "karta pracy"
);

assert.equal(
  isMaterialGenerationEnabled("karta pracy"),
  true
);

assert.equal(
  isMaterialGenerationEnabled("kartkówka"),
  true
);

assert.equal(
  isMaterialGenerationEnabled("sprawdzian"),
  true
);

assert.equal(
  isKnownMaterialType("sprawdzian"),
  true
);

assert.equal(
  getMaterialContentSchemaVersion("kartkówka"),
  "material_schema_v3"
);

assert.equal(
  getMaterialContentSchemaVersion("karta pracy"),
  "material_schema_v4"
);

assert.equal(
  getMaterialContentSchemaVersion("sprawdzian"),
  "material_schema_v4"
);

assert.equal(
  isMaterialContentSchemaVersionSupported({
    materialType: "kartkówka",
    contentSchemaVersion: "material_schema_v3",
  }),
  true
);

assert.equal(
  isMaterialContentSchemaVersionSupported({
    materialType: "karta pracy",
    contentSchemaVersion: "material_schema_v4",
  }),
  true
);

assert.equal(
  isMaterialContentSchemaVersionSupported({
    materialType: "sprawdzian",
    contentSchemaVersion: "material_schema_v4",
  }),
  true
);

assert.equal(
  isMaterialContentSchemaVersionSupported({
    materialType: "kartkówka",
    contentSchemaVersion: "material_schema_v1",
  }),
  true
);

assert.equal(
  isMaterialContentSchemaVersionSupported({
    materialType: "karta pracy",
    contentSchemaVersion: "material_schema_v2",
  }),
  true
);

assert.equal(
  isMaterialContentSchemaVersionSupported({
    materialType: "karta pracy",
    contentSchemaVersion: "material_schema_v3",
  }),
  true
);

assert.equal(
  isMaterialContentSchemaVersionSupported({
    materialType: "kartkówka",
    contentSchemaVersion: "material_schema_v2",
  }),
  true
);

assert.equal(
  isMaterialContentSchemaVersionSupported({
    materialType: "sprawdzian",
    contentSchemaVersion: "material_schema_v1",
  }),
  true
);

assert.equal(
  isMaterialContentSchemaVersionSupported({
    materialType: "sprawdzian",
    contentSchemaVersion: "material_schema_v3",
  }),
  true
);

assert.equal(
  isMaterialContentSchemaVersionSupported({
    materialType: "karta pracy",
    contentSchemaVersion: "material_schema_v1",
  }),
  false
);

assert.throws(
  () => getMaterialContentSchemaVersion("nieznany"),
  /Brak wersji kontraktu treści/
);

console.log("TEST MATERIAL CONTRACTS: OK");
