import { gql } from 'graphql-tag';

export const categoryDefs = gql`
 type Category {
    id: Int!
    name: String!
    slug: String!
    description: String
    parent: Category
    children: [Category]
    posts: [Post]
  }

  type Query {
    categories: [Category!]!
    category(slug: String!): Category
}
`


