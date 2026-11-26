//
//  NameValue.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

import Foundation

public struct NameValue: Equatable, CustomStringConvertible {
    
    public let nameSpace: String?
    public let name: String
    public var value: String
    public var mdocDataType: MdocDataType?
    public var order: Int = 0
    public var children: [NameValue]?
    
    // Custom description for the NameValue (for easy printing)
    public var description: String { "\(name): \(value)" }
    
    // Initializer for creating a NameValue instance
    // - Parameters:
    //   - name: The key or name of the value
    //   - value: The associated value as a string
    //   - ns: Optional namespace for the NameValue
    //   - mdocDataType: Optional data type associated with the value
    //   - order: Order number, useful for sorting or prioritizing (default is 0)
    //   - children: Optional list of child NameValue instances
    public init(
        name: String,
        value: String,
        nameSpace: String? = nil,
        mdocDataType: MdocDataType? = nil,
        order: Int = 0,
        children: [NameValue]? = nil
    ) {
        self.name = name
        self.value = value
        self.nameSpace = nameSpace
        self.mdocDataType = mdocDataType
        self.order = order
        self.children = children
    }
    
    // Adds a child NameValue to the current instance
    // - Parameter child: A NameValue instance to add as a child
    public mutating func add(child: NameValue) {
        if children == nil { children = [] }
        children!.append(child)
    }
    
}

public struct NameImage {
  
    public let nameSpace: String?
    public let name: String
    public let image: Data
    
    // Initializer for creating a NameImage instance
    // - Parameters:
    //   - name: The key or name for the image
    //   - image: The image data as Data type
    //   - nameSpace: Optional namespace for the image
    public init(name: String, image: Data, nameSpace: String? = nil) {
        self.name = name
        self.image = image
        self.nameSpace = nameSpace
    }
    
}
