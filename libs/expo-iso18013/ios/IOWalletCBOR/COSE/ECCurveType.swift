//
//  ECCurveType.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//


/*Key types are identified by the 'kty' member of the COSE_Key object.
 In this document, we define four values for the member:
 
 +-----------+-------+-----------------------------------------------+
 | Name      | Value | Description                                   |
 +-----------+-------+-----------------------------------------------+
 | OKP       | 1     | Octet Key Pair                                |
 | EC2       | 2     | Elliptic Curve Keys w/ x- and y-coordinate    |
 |           |       | pair                                          |
 | Symmetric | 4     | Symmetric Keys                                |
 | Reserved  | 0     | This value is reserved                        |
 +-----------+-------+-----------------------------------------------+
 */
public enum ECCurveType: UInt64 {
  case OKP = 1
  case EC2 = 2
  case Symmetric = 4
  case Reserved = 0
  
}
