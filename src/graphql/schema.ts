import { gql } from 'apollo-server-fastify';

export const typeDefs = gql`
  scalar DateTime

  type User {
    id: ID!
    email: String!
    username: String!
    fullName: String!
    bio: String
    avatarUrl: String
    locale: String!
    timezone: String!
    emailVerified: Boolean!
    mfaEnabled: Boolean!
    trustScore: Float!
    reputationPoints: Int!
    createdAt: DateTime!
  }

  type Session {
    id: ID!
    deviceInfo: String
    ipAddress: String
    createdAt: DateTime!
    lastActivityAt: DateTime!
  }

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  type MfaSetupPayload {
    secret: String!
    qrCodeUri: String!
    backupCodes: [String!]!
  }

  input RegisterInput {
    email: String!
    username: String!
    password: String!
    fullName: String!
  }

  input LoginInput {
    emailOrUsername: String!
    password: String!
    mfaCode: String
  }

  input UpdateProfileInput {
    fullName: String
    bio: String
    locale: String
    timezone: String
  }

  type Query {
    me: User
    mySessions: [Session!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!
    logoutAll: Boolean!
    revokeSession(sessionId: ID!): Boolean!

    updateProfile(input: UpdateProfileInput!): User!

    setupMfa(password: String!): MfaSetupPayload!
    verifyMfa(code: String!): Boolean!
    disableMfa: Boolean!
  }
`;
