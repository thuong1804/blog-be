import { gql } from 'graphql-tag';

export const categoryDefs = gql`
 type Category {
    id: Int!
    name: String!
    description: String
    parent: Category
    children: [Category]
  }
`
