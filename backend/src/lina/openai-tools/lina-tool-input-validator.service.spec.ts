import { LinaToolInputValidatorService } from "./lina-tool-input-validator.service";
import { LinaToolJsonSchema } from "./lina-tool.types";

describe("LinaToolInputValidatorService", () => {
  let validator:
    LinaToolInputValidatorService;

  beforeEach(() => {
    validator =
      new LinaToolInputValidatorService();
  });

  it("accepts a valid strict empty object", () => {
    const schema: LinaToolJsonSchema = {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    };

    expect(
      validator.validate(schema, {}),
    ).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("rejects missing required and unknown fields", () => {
    const schema: LinaToolJsonSchema = {
      type: "object",
      properties: {
        query: {
          type: "string",
        },
      },
      required: ["query"],
      additionalProperties: false,
    };

    const result = validator.validate(
      schema,
      {
        unexpected: true,
      },
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "$.query: zorunlu alan eksik.",
        "$.unexpected: tanımsız alan gönderilemez.",
      ]),
    );
  });

  it("validates enum and string length rules", () => {
    const schema: LinaToolJsonSchema = {
      type: "object",
      properties: {
        country: {
          type: "string",
          enum: ["TR", "KKTC"],
        },
        message: {
          type: "string",
          minLength: 2,
          maxLength: 5,
        },
      },
      required: [
        "country",
        "message",
      ],
      additionalProperties: false,
    };

    const result = validator.validate(
      schema,
      {
        country: "US",
        message: "x",
      },
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "$.country: izin verilen değerlerden biri olmalıdır.",
        "$.message: en az 2 karakter olmalıdır.",
      ]),
    );
  });

  it("validates nested objects, arrays and number limits", () => {
    const schema: LinaToolJsonSchema = {
      type: "object",
      properties: {
        payload: {
          type: "object",
          properties: {
            values: {
              type: "array",
              minItems: 2,
              items: {
                type: "integer",
                minimum: 1,
                maximum: 10,
              },
            },
          },
          required: ["values"],
          additionalProperties: false,
        },
      },
      required: ["payload"],
      additionalProperties: false,
    };

    const result = validator.validate(
      schema,
      {
        payload: {
          values: [0, 11],
        },
      },
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "$.payload.values[0]: 1 değerinden küçük olamaz.",
        "$.payload.values[1]: 10 değerinden büyük olamaz.",
      ]),
    );
  });

  it("rejects a non-object root input", () => {
    const schema: LinaToolJsonSchema = {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    };

    const result =
      validator.validate(
        schema,
        "invalid",
      );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      "$: beklenen veri tipi object.",
    ]);
  });
});
