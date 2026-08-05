const MATERIAL_CONTENT_SCHEMA_CONTRACTS = Object.freeze({
  "karta pracy": Object.freeze({
    current: "material_schema_v6",
    supported: Object.freeze([
      "material_schema_v2",
      "material_schema_v3",
      "material_schema_v4",
      "material_schema_v5",
      "material_schema_v6",
    ]),
  }),

  "kartkówka": Object.freeze({
    current: "material_schema_v5",
    supported: Object.freeze([
      "material_schema_v1",
      "material_schema_v2",
      "material_schema_v3",
      "material_schema_v4",
      "material_schema_v5",
    ]),
  }),

  "sprawdzian": Object.freeze({
    current: "material_schema_v6",
    supported: Object.freeze([
      "material_schema_v1",
      "material_schema_v2",
      "material_schema_v3",
      "material_schema_v4",
      "material_schema_v5",
      "material_schema_v6",
    ]),
  }),
});

const GENERATABLE_MATERIAL_TYPES = new Set([
  "karta pracy",
  "kartkówka",
  "sprawdzian",
]);

export function normalizeMaterialType(materialType) {
  return typeof materialType === "string"
    ? materialType.trim().toLowerCase()
    : "";
}

export function isKnownMaterialType(materialType) {
  const normalizedMaterialType =
    normalizeMaterialType(materialType);

  return Object.prototype.hasOwnProperty.call(
    MATERIAL_CONTENT_SCHEMA_CONTRACTS,
    normalizedMaterialType
  );
}

export function isMaterialGenerationEnabled(materialType) {
  return GENERATABLE_MATERIAL_TYPES.has(
    normalizeMaterialType(materialType)
  );
}

export function getMaterialContentSchemaVersion(materialType) {
  const normalizedMaterialType =
    normalizeMaterialType(materialType);

  const contract =
    MATERIAL_CONTENT_SCHEMA_CONTRACTS[
      normalizedMaterialType
    ];

  if (!contract) {
    throw new Error(
      `Brak wersji kontraktu treści dla typu materiału: ${
        normalizedMaterialType || "[brak]"
      }.`
    );
  }

  return contract.current;
}

export function isMaterialContentSchemaVersionSupported({
  materialType,
  contentSchemaVersion,
}) {
  if (!isKnownMaterialType(materialType)) {
    return false;
  }

  const normalizedMaterialType =
    normalizeMaterialType(materialType);

  return MATERIAL_CONTENT_SCHEMA_CONTRACTS[
    normalizedMaterialType
  ].supported.includes(contentSchemaVersion);
}
