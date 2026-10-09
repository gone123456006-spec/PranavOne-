import * as mongo from './mongoStore.js'

export async function getOwnProfile(tenantId) {
  return mongo.mongoGetOwnProfile(tenantId)
}

export async function getOwnDatabaseSnapshot(tenantId) {
  return mongo.mongoGetOwnDatabaseSnapshot(tenantId)
}

export async function upsertRegistration(identity, registration) {
  return mongo.mongoUpsertRegistration(identity, registration)
}
