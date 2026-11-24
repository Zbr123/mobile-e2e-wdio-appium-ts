import { expect } from 'expect';
import { z } from 'zod';
import { bffConfigured, env } from '../../src/config/env';
import { errorCodes, gql } from '../../src/api/http';
import { TestData, type Appointment } from '../../src/api/testData';

/**
 * GraphQL BFF (NestJS + Apollo). Rule: a 200 response is NOT a pass.
 * Apollo returns HTTP 200 for resolver errors, so every test asserts the body:
 * `data`, the `errors` array, `extensions.code` and `path`.
 */
const APPOINTMENT = /* GraphQL */ `
  query Appointment($id: ID!) {
    appointment(id: $id) { id startsAt pet { id name } }
  }`;

const BOOK = /* GraphQL */ `
  mutation Book($input: BookAppointmentInput!) {
    bookAppointment(input: $input) { id }
  }`;

/** Contract check: catches renamed/null fields that a status-code check would miss. */
const AppointmentSchema = z.object({
  id: z.string().min(1),
  startsAt: z.string().datetime(),
  pet: z.object({ id: z.string(), name: z.string() }),
});

describe('BFF GraphQL: appointments', function () {
  const owner = new TestData(env.bff.tokenPrimary);
  let appt: Appointment;

  before(async function () {
    if (!bffConfigured()) this.skip();
    appt = await owner.bookAppointment(await owner.createPet());
  });

  after(async () => {
    await owner.cleanup();
  });

  it('PC-TC-201 returns the owner\'s appointment with the agreed shape', async () => {
    const res = await gql<{ appointment: Appointment }>(APPOINTMENT, { id: appt.id }, env.bff.tokenPrimary);
    expect(res.status).toBe(200);
    expect(res.errors).toBeUndefined();
    const parsed = AppointmentSchema.parse(res.data?.appointment);
    expect(parsed.pet.id).toBe(appt.pet.id);
  });

  it('PC-TC-202 without a token: no data, UNAUTHENTICATED in errors[]', async () => {
    const res = await gql<{ appointment: Appointment | null }>(APPOINTMENT, { id: appt.id });
    expect(res.data?.appointment ?? null).toBeNull();
    expect(errorCodes(res)).toContain('UNAUTHENTICATED');
  });

  it('PC-TC-203 another user cannot read it (FORBIDDEN or NOT_FOUND, never the data)', async function () {
    if (!env.bff.tokenSecondary) this.skip();
    const res = await gql<{ appointment: Appointment | null }>(APPOINTMENT, { id: appt.id }, env.bff.tokenSecondary);
    expect(res.data?.appointment ?? null).toBeNull();
    expect(['FORBIDDEN', 'NOT_FOUND']).toContain(errorCodes(res)[0]);
    expect(JSON.stringify(res)).not.toContain(appt.pet.name); // nothing leaks via error messages
  });

  it('PC-TC-204 booking in the past is rejected with a field-level error', async () => {
    const res = await gql(
      BOOK,
      { input: { petId: appt.pet.id, startsAt: '2020-01-01T00:00:00.000Z', reason: 'e2e' } },
      env.bff.tokenPrimary,
    );
    expect(res.data).toBeNull();
    expect(['BAD_USER_INPUT', 'BAD_REQUEST']).toContain(errorCodes(res)[0]);
    expect(res.errors?.[0]?.path).toEqual(['bookAppointment']);
  });

  it('PC-TC-205 an invalid query fails validation with HTTP 400', async () => {
    const res = await gql(`query { appointment(id: "x") { fieldThatDoesNotExist } }`, {}, env.bff.tokenPrimary);
    expect(res.status).toBe(400);
    expect(errorCodes(res)).toContain('GRAPHQL_VALIDATION_FAILED');
  });
});
