import { expect } from 'expect';
import { z } from 'zod';
import { bffConfigured, env } from '../../src/config/env';
import { rest } from '../../src/api/http';
import { TestData, type Pet } from '../../src/api/testData';

/** REST endpoints: status codes, response shape, error body and permissions. */
const PetSchema = z.object({ id: z.string(), name: z.string(), species: z.enum(['DOG', 'CAT', 'OTHER']) });
const ErrorSchema = z.object({ statusCode: z.number(), message: z.union([z.string(), z.array(z.string())]) });

describe('BFF REST: /pets', () => {
  const data = new TestData(env.bff.tokenPrimary);
  let pet: Pet;

  before(async function () {
    if (!bffConfigured()) this.skip();
    pet = await data.createPet('CAT');
  });

  after(async () => {
    await data.cleanup();
  });

  it('PC-TC-211 GET /pets/:id returns 200 and the pet', async () => {
    const res = await rest('GET', `/pets/${pet.id}`, { token: env.bff.tokenPrimary });
    expect(res.status).toBe(200);
    expect(PetSchema.parse(res.body)).toMatchObject({ id: pet.id, species: 'CAT' });
  });

  it('PC-TC-212 no token -> 401 with the standard error body', async () => {
    const res = await rest('GET', `/pets/${pet.id}`);
    expect(res.status).toBe(401);
    ErrorSchema.parse(res.body);
  });

  it('PC-TC-213 another user -> 403/404, never 200', async function () {
    if (!env.bff.tokenSecondary) this.skip();
    const res = await rest('GET', `/pets/${pet.id}`, { token: env.bff.tokenSecondary });
    expect([403, 404]).toContain(res.status);
  });

  it('PC-TC-214 invalid body -> 400 listing the bad field', async () => {
    const res = await rest<{ message: string[] }>('POST', '/pets', {
      token: env.bff.tokenPrimary,
      body: { name: '', species: 'DRAGON' },
    });
    expect(res.status).toBe(400);
    expect(res.body.message.join(' ')).toMatch(/species/);
  });
});
