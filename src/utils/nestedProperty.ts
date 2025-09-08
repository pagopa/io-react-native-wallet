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
  const isLeaf = rest.length === 0;

  if (isObject(sourceValue)) {
    // Check if any remaining string keys in the path exist in current sourceValue
    // This handles nested object paths (unlike arrays which use null in the path)
    const hasRestKey = rest.some(
      (r) => typeof r === "string" && r in sourceValue
    );

    if (hasRestKey) {
      return handleRestKey(currentObject, key, rest, sourceValue, displayData);
    }

    // Skip processing when the key is not found within the claim object
    if (!(key in sourceValue)) {
      // Leaf node: create a node with an empty value and display name
      if (isLeaf) {
        return {
          ...currentObject,
          [key]: { value: {}, name: buildName(displayData) },
        };
      }
      // Skip processing when the key is not found within the claim object
      return currentObject;
    }

    nextSourceValue = sourceValue[key];
  }

  // base case
  if (isLeaf) {
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

// Handles the case where the next key in the path exists in the source object
const handleRestKey = (
  currentObject: Record<string, any>,
  key: string,
  rest: Path,
  sourceValue: Record<string, unknown>,
  displayData: DisplayData
): NodeOrStructure => {
  const currentNode = currentObject[key] ?? {};
  // Take the first key in the remaining path
  const restKey = rest[0] as string;
  const nextSourceValue = sourceValue[restKey];

  // Merge the current node with the updated nested property for the remaining path.
  return {
    ...currentObject,
    [key]: {
      ...currentNode,
      value: createNestedProperty(
        currentNode.value ?? {},
        rest,
        nextSourceValue,
        displayData
      ),
    },
  };
};
