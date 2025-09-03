import { isObject } from "./misc";

// The data used to create localized names
type DisplayData = { locale: string; name: string }[];

// The resulting object of localized names { en: "Name", it: "Nome" }
type LocalizedNames = Record<string, string>;

// The core structure being built: a node containing the actual value and its localized names
type PropertyNode<T> = {
  value: T;
  name: LocalizedNames;
};

// A path can consist of object keys, array indices, or null for mapping
type Path = (string | number | null)[];

// A union of all possible shapes. It can be a custom PropertyNode or a standard object/array structure
type NodeOrStructure = Partial<PropertyNode<any>> | Record<string, any> | any[];

// Helper to build localized names from the display data.
const buildName = (display: DisplayData): LocalizedNames =>
  display.reduce(
    (names, { locale, name }) => ({ ...names, [locale]: name }),
    {}
  );

// Handles the case where the path key is `null`
const handleNullKeyCase = (
  currentObject: NodeOrStructure,
  rest: Path,
  sourceValue: unknown,
  displayData: DisplayData
): NodeOrStructure => {
  if (!Array.isArray(sourceValue)) return currentObject;

  // We assert the type here because we know this branch handles PropertyNodes
  const node = currentObject as Partial<PropertyNode<unknown[]>>;
  const existingValue = Array.isArray(node.value) ? node.value : [];

  const mappedArray = sourceValue.map((item, idx) =>
    createNestedProperty(existingValue[idx] || {}, rest, item, displayData)
  );

  return {
    ...node,
    value: mappedArray,
    name: node.name ?? buildName(displayData),
  };
};

// Handles the case where the path key is a string
const handleStringKeyCase = (
  currentObject: NodeOrStructure,
  key: string,
  rest: Path,
  sourceValue: unknown,
  displayData: DisplayData
): NodeOrStructure => {
  let nextSourceValue = sourceValue;

  if (isObject(sourceValue)) {
    // Check if current key exists in sourceValue
    const hasKey = key in sourceValue;
    // Check if any remaining string keys in the path exist in current sourceValue
    // This handles nested object paths (unlike arrays which use null in the path)
    const hasRestKey = rest.some(
      (r) => typeof r === "string" && r in sourceValue
    );

    // Get or initialize the node corresponding to the current key
    const node = (currentObject as Record<string, PropertyNode<unknown>>)[
      key
    ] ?? {
      value: {},
      name: buildName(displayData),
    };

    // If there are no more keys in the path and the current key does not exist in the source
    // we create a node with an empty `value` object and a `name` with display data
    if (rest.length === 0 && !hasKey) {
      return {
        ...currentObject,
        [key]: node,
      };
    }

    // If there is exactly one key left in the path and the next key exists in the source
    // we recursively insert the nested property inside the existing node
    if (rest.length === 1 && hasRestKey) {
      return {
        ...currentObject,
        [key]: {
          ...node,
          value: createNestedProperty(
            node.value || {},
            rest,
            nextSourceValue,
            displayData
          ),
        },
      };
    }

    // Skip processing if neither current key nor any future keys exist in the claim object
    if (!hasKey && !hasRestKey) return currentObject;
    if (hasKey) nextSourceValue = sourceValue[key];
  }

  // base case
  if (rest.length === 0) {
    return {
      ...currentObject,
      [key]: { value: nextSourceValue, name: buildName(displayData) },
    };
  }

  // recursive step
  const nextObject =
    (currentObject as Record<string, NodeOrStructure>)[key] || {};

  return {
    ...currentObject,
    [key]: createNestedProperty(nextObject, rest, nextSourceValue, displayData),
  };
};

// Handles the case where the path key is a number
const handleNumberKeyCase = (
  currentObject: NodeOrStructure,
  key: number,
  rest: Path,
  sourceValue: unknown,
  displayData: DisplayData
): NodeOrStructure => {
  const newArray = Array.isArray(currentObject) ? [...currentObject] : [];
  const nextValue = Array.isArray(sourceValue) ? sourceValue[key] : undefined;

  newArray[key] = createNestedProperty(
    newArray[key] || {},
    rest,
    nextValue,
    displayData
  );
  return newArray;
};

/**
 * Recursively constructs a nested object with descriptive properties from a path.
 *
 * @param currentObject - The object or array being built upon.
 * @param path - The path segments to follow.
 * @param sourceValue - The raw value to place at the end of the path.
 * @param displayData - The data for generating localized names.
 * @returns The new object or array structure.
 */
export const createNestedProperty = (
  currentObject: NodeOrStructure,
  path: Path,
  sourceValue: unknown, // Use `unknown` for type-safe input
  displayData: DisplayData
): NodeOrStructure => {
  const [key, ...rest] = path;

  switch (true) {
    case key === null:
      return handleNullKeyCase(currentObject, rest, sourceValue, displayData);

    case typeof key === "string":
      return handleStringKeyCase(
        currentObject,
        key as string,
        rest,
        sourceValue,
        displayData
      );

    case typeof key === "number":
      return handleNumberKeyCase(
        currentObject,
        key as number,
        rest,
        sourceValue,
        displayData
      );

    default:
      return currentObject;
  }
};
